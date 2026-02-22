const https = require('https');
const http = require('http');

module.exports = function(RED) {
    function MLflowRunNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.on('input', async function(msg, send, done) {
            const operation = config.operation || 'create';
            const trackingUri = config.trackingUri || msg.trackingUri || 'http://localhost:5000';
            const experimentId = config.experimentId || msg.experimentId;
            const runName = config.runName || msg.runName || `run-${Date.now()}`;

            if (!experimentId && operation === 'create') {
                node.status({fill:"red", shape:"ring", text:"missing experimentId"});
                const errorMsg = "Experiment ID is required";
                node.error(errorMsg, msg);
                msg.error = errorMsg;
                send(msg);
                if (done) done();
                return;
            }

            node.status({fill:"blue", shape:"dot", text:"managing run..."});

            try {
                let result;

                if (operation === 'create') {
                    result = await createRun(trackingUri, experimentId, runName, node);
                    msg.run = result;
                    msg.runId = result.run.info.run_id;
                    msg.runName = runName;
                    node.status({fill:"green", shape:"dot", text:"run created"});
                } else if (operation === 'update-status') {
                    const runId = config.runId || msg.runId;
                    const status = config.status || msg.status || 'FINISHED';

                    if (!runId) {
                        throw new Error("Run ID is required for update-status");
                    }

                    result = await updateRunStatus(trackingUri, runId, status, node);
                    msg.runUpdated = result;
                    node.status({fill:"green", shape:"dot", text:`run ${status}`});
                }

                send(msg);
            } catch (err) {
                node.status({fill:"red", shape:"ring", text:"error"});
                const errorMsg = err.message || String(err);
                node.error(`MLflow run error: ${errorMsg}`);
                msg.error = errorMsg;
                send(msg);
            } finally {
                if (done) done();
            }
        });
    }

    RED.nodes.registerType("mlflow-run", MLflowRunNode);

    async function makeRequest(trackingUri, path, options = {}) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, trackingUri);
            const isHttps = url.protocol === 'https:';
            const lib = isHttps ? https : http;

            const bodyString = options.body ? JSON.stringify(options.body) : null;
            
            const reqOptions = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname + url.search,
                method: options.method || 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': bodyString ? Buffer.byteLength(bodyString) : 0,
                    ...options.headers
                },
                timeout: 10000 // 10 second timeout
            };

            const req = lib.request(reqOptions, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        resolve({
                            ok: res.statusCode >= 200 && res.statusCode < 300,
                            status: res.statusCode,
                            data: parsed
                        });
                    } catch (e) {
                        resolve({
                            ok: res.statusCode >= 200 && res.statusCode < 300,
                            status: res.statusCode,
                            data: data,
                            errorText: data
                        });
                    }
                });
            });

            req.on('error', (err) => {
                reject(new Error(`Connection error: ${err.message}. Is MLflow server running at ${trackingUri}?`));
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error(`Request timeout: MLflow server did not respond within 10 seconds`));
            });

            if (bodyString) {
                req.write(bodyString);
            }

            req.end();
        });
    }

    async function createRun(trackingUri, experimentId, runName, node) {
        const path = '/api/2.0/mlflow/runs/create';
        const startTime = Date.now() * 1000; // Convert to microseconds

        const body = {
            experiment_id: String(experimentId),
            name: runName,
            start_time: startTime,
            tags: [{ key: "mlflow.runName", value: runName }]
        };

        if (node) node.log(`Creating run with experiment_id: ${experimentId}, name: ${runName}`);
        if (node) node.log(`Request body: ${JSON.stringify(body)}`);

        const result = await makeRequest(trackingUri, path, {
            method: 'POST',
            body: body
        });

        if (!result.ok) {
            const errorMsg = typeof result.data === 'object'
                ? JSON.stringify(result.data)
                : (result.data || result.errorText || `HTTP ${result.status}`);
            if (node) node.error(`Create run error: ${errorMsg}`);
            throw new Error(`Failed to create run: ${errorMsg}`);
        }
        return result.data;
    }

    async function updateRunStatus(trackingUri, runId, status, node) {
        const path = '/api/2.0/mlflow/runs/update';
        const result = await makeRequest(trackingUri, path, {
            method: 'POST',
            body: {
                run_uuid: runId,
                status: status
            }
        });

        if (!result.ok) {
            const errorMsg = typeof result.data === 'object' 
                ? JSON.stringify(result.data) 
                : (result.data || result.errorText || `HTTP ${result.status}`);
            if (node) node.error(`Update run status error: ${errorMsg}`);
            throw new Error(`Failed to update run status: ${errorMsg}`);
        }
        return result.ok;
    }
};

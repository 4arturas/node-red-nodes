const https = require('https');
const http = require('http');

module.exports = function(RED) {
    function MLflowExperimentNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.on('input', async function(msg, send, done) {
            const operation = config.operation || 'get-by-name';
            const experimentName = config.experimentName || msg.experimentName || 'default';
            const trackingUri = config.trackingUri || 'http://localhost:5000';

            node.status({fill:"blue", shape:"dot", text:"fetching experiment..."});

            try {
                let result;

                if (operation === 'get-by-name') {
                    result = await getExperimentByName(trackingUri, experimentName);
                    msg.experiment = result;

                    if (result && result.experiment && result.experiment.lifecycle_stage === "active") {
                        msg.experimentId = result.experiment.experiment_id;
                        msg.existing = true;
                        node.status({fill:"green", shape:"dot", text:"found existing experiment"});
                        node.log(`Found experiment: ${experimentName} (ID: ${msg.experimentId})`);
                    } else {
                        msg.existing = false;
                        node.status({fill:"yellow", shape:"dot", text:"experiment not found"});
                        node.log(`Experiment not found: ${experimentName}`);
                    }
                } else if (operation === 'create') {
                    result = await createExperiment(trackingUri, experimentName, node);
                    msg.experiment = result;
                    msg.experimentId = result.experiment_id;
                    msg.existing = false;
                    node.status({fill:"green", shape:"dot", text:"created new experiment"});
                    node.log(`Created experiment: ${experimentName} (ID: ${msg.experimentId})`);
                } else if (operation === 'get-or-create') {
                    // First try to get
                    result = await getExperimentByName(trackingUri, experimentName);

                    if (result && result.experiment && result.experiment.lifecycle_stage === "active") {
                        msg.experiment = result;
                        msg.experimentId = result.experiment.experiment_id;
                        msg.existing = true;
                        node.status({fill:"green", shape:"dot", text:"found existing experiment"});
                        node.log(`Found experiment: ${experimentName} (ID: ${msg.experimentId})`);
                    } else {
                        // Create new
                        result = await createExperiment(trackingUri, experimentName, node);
                        msg.experiment = result;
                        msg.experimentId = result.experiment_id;
                        msg.existing = false;
                        node.status({fill:"green", shape:"dot", text:"created new experiment"});
                        node.log(`Created experiment: ${experimentName} (ID: ${msg.experimentId})`);
                    }
                }

                send(msg);
            } catch (err) {
                node.status({fill:"red", shape:"ring", text:"error"});
                const errorMsg = err.message || String(err);
                node.error(`MLflow experiment error: ${errorMsg}`);
                msg.error = errorMsg;
                send(msg);
            } finally {
                if (done) done();
            }
        });
    }

    RED.nodes.registerType("mlflow-experiment", MLflowExperimentNode);

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

            console.log(`[mlflow] Request: ${options.method || 'GET'} ${url.href}`);
            console.log(`[mlflow] Body: ${bodyString}`);
            console.log(`[mlflow] Content-Length: ${bodyString ? Buffer.byteLength(bodyString) : 0}`);

            const req = lib.request(reqOptions, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    console.log(`[mlflow] Response (${res.statusCode}): ${data.substring(0, 200)}`);
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
                console.log(`[mlflow] Request error: ${err.message}`);
                reject(new Error(`Connection error: ${err.message}. Is MLflow server running at ${trackingUri}?`));
            });

            req.on('timeout', () => {
                console.log(`[mlflow] Request timeout`);
                req.destroy();
                reject(new Error(`Request timeout: MLflow server did not respond within 10 seconds`));
            });

            if (bodyString) {
                req.write(bodyString);
            }

            req.end();
        });
    }

    async function getExperimentByName(trackingUri, name) {
        const path = `/api/2.0/mlflow/experiments/get-by-name?experiment_name=${encodeURIComponent(name)}`;
        const result = await makeRequest(trackingUri, path);
        
        if (!result.ok) {
            if (result.status === 404) {
                return null;
            }
            return result.data;
        }
        return result.data;
    }

    async function createExperiment(trackingUri, name, node) {
        const path = '/api/2.0/mlflow/experiments/create';
        
        const body = { name: name };  // MLflow API expects 'name' parameter
        
        if (node) node.log(`Creating experiment with name: ${name}`);
        if (node) node.log(`Request body: ${JSON.stringify(body)}`);

        const result = await makeRequest(trackingUri, path, {
            method: 'POST',
            body: body
        });

        if (!result.ok) {
            const errorMsg = typeof result.data === 'object' 
                ? JSON.stringify(result.data) 
                : (result.data || result.errorText || `HTTP ${result.status}`);
            if (node) node.error(`Create experiment error: ${errorMsg}`);
            throw new Error(`Failed to create experiment: ${errorMsg}`);
        }
        return result.data;
    }
};

const https = require('https');
const http = require('http');

module.exports = function(RED) {
    function MLflowLogParamNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.on('input', async function(msg, send, done) {
            const trackingUri = config.trackingUri || msg.trackingUri || 'http://localhost:5000';
            const runId = config.runId || msg.runId;
            const paramName = config.paramName || msg.paramName || 'param';
            
            // Get param value - support both config value and msg property reference
            let paramValue;
            if (config.paramValue && config.paramValue.startsWith('msg.')) {
                // Reference to msg property like msg.topic
                const propPath = config.paramValue.substring(4);
                paramValue = getProperty(msg, propPath);
            } else if (config.paramValue !== undefined && config.paramValue !== '') {
                paramValue = config.paramValue;
            } else if (msg.paramValue !== undefined) {
                paramValue = msg.paramValue;
            } else if (msg.payload !== undefined) {
                paramValue = msg.payload;
            }

            if (!runId) {
                node.status({fill:"red", shape:"ring", text:"missing runId"});
                node.error("Run ID is required", msg);
                if (done) done();
                return;
            }

            if (paramValue === undefined) {
                node.status({fill:"red", shape:"ring", text:"missing paramValue"});
                node.error("Param value is required", msg);
                if (done) done();
                return;
            }

            node.status({fill:"blue", shape:"dot", text:"logging param..."});

            try {
                const result = await logParam(trackingUri, runId, paramName, paramValue);
                msg.paramLogged = result;
                node.status({fill:"green", shape:"dot", text:`param ${paramName} logged`});
                send(msg);
            } catch (err) {
                node.status({fill:"red", shape:"ring", text:"error"});
                node.error(err, msg);
            } finally {
                if (done) done();
            }
        });
    }

    RED.nodes.registerType("mlflow-log-param", MLflowLogParamNode);

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
                timeout: 10000
            };

            const req = lib.request(reqOptions, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    resolve({
                        ok: res.statusCode >= 200 && res.statusCode < 300,
                        status: res.statusCode,
                        data: data,
                        errorText: data
                    });
                });
            });

            req.on('error', (err) => {
                reject(new Error(`Connection error: ${err.message}`));
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error(`Request timeout`));
            });

            if (bodyString) {
                req.write(bodyString);
            }

            req.end();
        });
    }

    async function logParam(trackingUri, runId, key, value) {
        const path = '/api/2.0/mlflow/runs/log-parameter';
        const result = await makeRequest(trackingUri, path, {
            method: 'POST',
            body: {
                run_uuid: runId,
                key: key,
                value: String(value)
            }
        });

        if (!result.ok) {
            throw new Error(`Failed to log param: ${result.errorText}`);
        }
        return result.ok;
    }

    function getProperty(obj, path) {
        return path.split('.').reduce((prev, curr) => prev ? prev[curr] : undefined, obj);
    }
};

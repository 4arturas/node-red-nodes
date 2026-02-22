const https = require('https');
const http = require('http');

module.exports = function(RED) {
    function MLflowLogMetricNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.on('input', async function(msg, send, done) {
            const trackingUri = config.trackingUri || msg.trackingUri || 'http://localhost:5000';
            const runId = config.runId || msg.runId;
            const metricName = config.metricName || msg.metricName || 'metric';
            
            // Get metric value - support both config value and msg property reference
            let metricValue;
            if (config.metricValue && config.metricValue.startsWith('msg.')) {
                // Reference to msg property like msg._outlineLength
                const propPath = config.metricValue.substring(4);
                metricValue = getProperty(msg, propPath);
            } else if (config.metricValue !== undefined && config.metricValue !== '') {
                metricValue = config.metricValue;
            } else if (msg.metricValue !== undefined) {
                metricValue = msg.metricValue;
            } else if (msg.payload !== undefined && typeof msg.payload === 'number') {
                metricValue = msg.payload;
            }

            if (!runId) {
                node.status({fill:"red", shape:"ring", text:"missing runId"});
                node.error("Run ID is required", msg);
                if (done) done();
                return;
            }

            if (metricValue === undefined || metricValue === '') {
                node.status({fill:"red", shape:"ring", text:"missing metricValue"});
                node.error("Metric value is required", msg);
                if (done) done();
                return;
            }

            node.status({fill:"blue", shape:"dot", text:"logging metric..."});

            try {
                const result = await logMetric(trackingUri, runId, metricName, metricValue);
                msg.metricLogged = result;
                node.status({fill:"green", shape:"dot", text:`metric ${metricName} logged`});
                send(msg);
            } catch (err) {
                node.status({fill:"red", shape:"ring", text:"error"});
                node.error(err, msg);
            } finally {
                if (done) done();
            }
        });
    }

    RED.nodes.registerType("mlflow-log-metric", MLflowLogMetricNode);

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

    async function logMetric(trackingUri, runId, key, value) {
        const path = '/api/2.0/mlflow/runs/log-metric';
        const result = await makeRequest(trackingUri, path, {
            method: 'POST',
            body: {
                run_uuid: runId,
                key: key,
                value: parseFloat(value),
                timestamp: Date.now() * 1000,
                step: 0
            }
        });

        if (!result.ok) {
            throw new Error(`Failed to log metric: ${result.errorText}`);
        }
        return result.ok;
    }

    function getProperty(obj, path) {
        return path.split('.').reduce((prev, curr) => prev ? prev[curr] : undefined, obj);
    }
};

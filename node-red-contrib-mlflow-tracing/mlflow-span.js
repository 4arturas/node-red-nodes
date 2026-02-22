const https = require('https');
const http = require('http');

module.exports = function(RED) {
    function MLflowSpanNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.on('input', async function(msg, send, done) {
            const spanName = config.spanName || msg.spanName || 'span';
            const spanType = config.spanType || msg.spanType || 'CHAIN';
            const trackingUri = config.trackingUri || msg.trackingUri || 'http://localhost:5000';
            const runId = config.runId || msg.runId;

            // Get the payload/content to process
            const content = msg.payload || msg.content;
            const topic = msg.topic;
            const outline = msg.outline;

            if (!runId) {
                node.status({fill:"red", shape:"ring", text:"missing runId"});
                node.error("Run ID is required for tracing", msg);
                if (done) done();
                return;
            }

            node.status({fill:"blue", shape:"dot", text:`span: ${spanName}`});

            try {
                // Start span
                const spanStartTime = Date.now() * 1000; // microseconds
                const spanId = `span-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                
                // Create span using MLflow REST API
                const spanData = await createSpan(trackingUri, runId, {
                    name: spanName,
                    spanType: spanType,
                    startTime: spanStartTime,
                    inputs: { topic, outline, content }
                });

                msg.spanId = spanId;
                msg.spanStartTime = spanStartTime;

                // Send to output for processing
                node.send({
                    ...msg,
                    _spanId: spanId,
                    _spanStartTime: spanStartTime,
                    _trackingUri: trackingUri,
                    _runId: runId,
                    _spanName: spanName
                });
            } catch (err) {
                node.status({fill:"red", shape:"ring", text:"error"});
                node.error(err, msg);
            } finally {
                if (done) done();
            }
        });

        node.on('close', function() {
            // Cleanup if needed
        });
    }

    RED.nodes.registerType("mlflow-span", MLflowSpanNode);

    async function makeRequest(trackingUri, path, options = {}) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, trackingUri);
            const isHttps = url.protocol === 'https:';
            const lib = isHttps ? https : http;

            const reqOptions = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname + url.search,
                method: options.method || 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
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

            req.on('error', reject);

            if (options.body) {
                req.write(JSON.stringify(options.body));
            }

            req.end();
        });
    }

    async function createSpan(trackingUri, runId, spanOptions) {
        // Note: MLflow tracing via REST API is limited
        // We'll log the span as an artifact/note for now
        // Full tracing requires the mlflow-tracing package
        const path = '/api/2.0/mlflow/runs/log-artifact';
        
        const spanInfo = {
            name: spanOptions.name,
            spanType: spanOptions.spanType,
            startTime: spanOptions.startTime,
            inputs: spanOptions.inputs,
            runId: runId
        };

        // For now, we just return the span info
        // Full implementation would use mlflow-tracing package
        return spanInfo;
    }
};

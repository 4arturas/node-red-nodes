const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

module.exports = function (RED) {
    function McpNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.on('input', async function (msg, send, done) {
            node.status({ fill: "blue", shape: "dot", text: "connecting..." });

            try {
                // Extract configuration
                const mode = config.mode || 'call';
                const allowedDirs = config.allowedDirs ? config.allowedDirs.split(',') : [];
                const command = config.command || 'npx';
                const serverArgs = config.serverArgs || '@modelcontextprotocol/server-filesystem';

                // Parse server arguments
                const args = serverArgs.split(' ').concat(allowedDirs);

                const transport = new StdioClientTransport({
                    command: command,
                    args: args
                });

                const client = new Client(
                    { name: 'mcp-node', version: '1.0.0' },
                    { capabilities: {} }
                );

                try {
                    await client.connect(transport);

                    if (mode === 'list') {
                        // List Mode: Get all available tools
                        const result = await client.listTools();
                        msg.payload = result.tools;
                        msg.mcpMode = 'list';
                    } else {
                        // Call Mode: Execute a specific tool
                        let toolName, toolArgs;

                        // Support flexible input formats
                        if (msg.payload && typeof msg.payload === 'object') {
                            // Format 1: { "name": "...", "arguments": { ... } }
                            if (msg.payload.name) {
                                toolName = msg.payload.name;
                                toolArgs = msg.payload.arguments || {};
                            }
                            // Format 2: { "action": "...", "arguments": { ... } } (legacy)
                            else if (msg.payload.action) {
                                toolName = msg.payload.action;
                                toolArgs = msg.payload.arguments || {};
                            }
                            // Format 3: { "call": { "name": "...", "arguments": { ... } } }
                            else if (msg.payload.call) {
                                toolName = msg.payload.call.name;
                                toolArgs = msg.payload.call.arguments || {};
                            }
                        }

                        if (!toolName) {
                            throw new Error("Tool name not found in msg.payload. Expected {name, arguments} or similar.");
                        }

                        const result = await client.callTool({
                            name: toolName,
                            arguments: toolArgs
                        });

                        // Extract text from content if possible, otherwise return full result
                        if (result.content && result.content[0] && result.content[0].text) {
                            msg.payload = result.content[0].text;
                        } else {
                            msg.payload = result;
                        }

                        msg.mcpResult = result;
                        msg.mcpTool = toolName;
                    }

                    node.status({ fill: "green", shape: "dot", text: "success" });
                    send(msg);
                } catch (error) {
                    node.status({ fill: "red", shape: "ring", text: "error" });
                    node.error(error, msg);
                    if (done) done(error);
                } finally {
                    try {
                        if (client.transport) {
                            await client.close();
                        }
                    } catch (e) {
                        // Ignore close errors
                    }
                }
            } catch (err) {
                node.status({ fill: "red", shape: "ring", text: "error" });
                node.error(err, msg);
                if (done) done(err);
            }
        });
    }

    RED.nodes.registerType("mcp-node", McpNode);
};
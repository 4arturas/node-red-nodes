const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

module.exports = function (RED) {
    function McpCallNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.server = RED.nodes.getNode(config.server);

        node.on('input', async function (msg, send, done) {
            node.status({ fill: "blue", shape: "dot", text: "connecting..." });

            let client;
            let transport;
            const isPersistent = !!node.server;

            try {
                if (isPersistent) {
                    client = await node.server.connect();
                } else {
                    const command = msg.command || config.command || 'npx';
                    const serverArgsRaw = msg.serverArgs || config.serverArgs || '';
                    const args = serverArgsRaw ? serverArgsRaw.split(' ').filter(arg => arg.trim() !== "") : [];

                    transport = new StdioClientTransport({
                        command: command,
                        args: args
                    });

                    client = new Client(
                        { name: 'mcp-call-client', version: '1.0.0' },
                        { capabilities: {} }
                    );

                    await client.connect(transport);
                }

                const toolName = msg.payload?.name;
                const toolArgs = msg.payload?.arguments || {};

                if (!toolName) {
                    throw new Error("msg.payload.name is required to call a tool");
                }

                const result = await client.callTool({
                    name: toolName,
                    arguments: toolArgs
                });

                // Simplify output for easier use in Node-RED
                if (result.content && result.content[0] && result.content[0].text) {
                    msg.payload = result.content[0].text;
                } else {
                    msg.payload = result;
                }

                msg.mcpResult = result; // Keep the full original result in a secondary property

                node.status({ fill: "green", shape: "dot", text: "success" });
                send(msg);
            } catch (error) {
                node.status({ fill: "red", shape: "ring", text: "error" });
                node.error(error.message || error, msg);
            } finally {
                if (!isPersistent) {
                    try {
                        if (client && client.transport) await client.close();
                    } catch (e) {
                        // Silent cleanup
                    }
                }
            }
            if (done) done();
        });
    }
    RED.nodes.registerType("mcp-call-tool", McpCallNode);
};
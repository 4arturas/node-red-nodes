const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

module.exports = function (RED) {
    function McpServerConfigNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.command = config.command;
        node.serverArgs = config.serverArgs;

        node.client = null;
        node.transport = null;
        node.connecting = false;
        node.connectionPromise = null;

        node.connect = async function () {
            if (node.client && node.transport && !node.connecting) {
                return node.client;
            }

            if (node.connecting) {
                return node.connectionPromise;
            }

            node.connecting = true;
            node.connectionPromise = (async () => {
                try {
                    // Improved argument parsing to handle spaces within quoted strings
                    const args = [];
                    if (node.serverArgs) {
                        const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
                        let match;
                        while ((match = regex.exec(node.serverArgs)) !== null) {
                            args.push(match[1] || match[2] || match[0]);
                        }
                    }

                    node.transport = new StdioClientTransport({
                        command: node.command,
                        args: args
                    });

                    node.client = new Client(
                        { name: 'mcp-config-client', version: '1.0.0' },
                        { capabilities: {} }
                    );

                    await node.client.connect(node.transport);
                    node.log(`Connected to MCP server: ${node.command} ${node.serverArgs}`);
                    return node.client;
                } catch (err) {
                    node.error(`Failed to connect to MCP server: ${err.message}`);
                    node.connecting = false;
                    node.client = null;
                    node.transport = null;
                    throw err;
                } finally {
                    node.connecting = false;
                }
            })();

            return node.connectionPromise;
        };

        node.on('close', async function (done) {
            if (node.client) {
                try {
                    await node.client.close();
                    node.log("MCP client connection closed");
                } catch (err) {
                    node.error(`Error closing MCP client: ${err.message}`);
                }
            }
            done();
        });
    }

    RED.nodes.registerType("mcp-server-config", McpServerConfigNode);
};

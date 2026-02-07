const { ChatOllama } = require("@langchain/ollama");

module.exports = function(RED) {
    function ChatOllamaNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        // Initialize the model once when the node is deployed
        const model = new ChatOllama({
            baseUrl: config.baseUrl,
            model: config.modelName,
            temperature: parseFloat(config.temperature)
        });

        node.on('input', async function(msg, send, done) {
            node.status({fill:"blue", shape:"dot", text:"thinking..."});

            try {
                // If msg.payload is a string, wrap it. If it's already an array of messages, pass it through.
                const input = Array.isArray(msg.payload) ? msg.payload : [["user", msg.payload]];

                const response = await model.invoke(input);

                // Set the output
                msg.payload = response.content;
                msg.rawResponse = response; // Optional: keep metadata

                node.status({fill:"green", shape:"dot", text:"done"});
                node.send(msg);
            } catch (err) {
                node.status({fill:"red", shape:"ring", text:"error"});
                node.error(err, msg);
            } finally {
                if (done) done();
            }
        });
    }
    RED.nodes.registerType("chat-ollama", ChatOllamaNode);
};
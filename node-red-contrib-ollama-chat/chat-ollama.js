const { ChatOllama } = require("@langchain/ollama");
const { ChatPromptTemplate } = require("@langchain/core/prompts");

module.exports = function(RED) {
    function ChatOllamaNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        const model = new ChatOllama({
            baseUrl: config.baseUrl,
            model: config.modelName,
            temperature: parseFloat(config.temperature)
        });

        node.on('input', async function(msg, send, done) {
            node.status({fill:"blue", shape:"dot", text:"thinking..."});

            try {
                let response;

                // Check if msg has RAG template configuration
                if (msg.template !== undefined && msg.context !== undefined && msg.question !== undefined) {
                    // RAG mode: Use ChatPromptTemplate with provided template
                    const prompt = ChatPromptTemplate.fromTemplate(msg.template);
                    const ragChain = prompt.pipe(model);

                    response = await ragChain.invoke({
                        context: msg.context,
                        question: msg.question
                    });
                    msg.payload = response.content;
                } else if (Array.isArray(msg.payload)) {
                    // Message tuple mode
                    const input = msg.payload;
                    response = await model.invoke(input);
                    msg.payload = response.content;
                } else {
                    // Simple text mode
                    const input = [["user", msg.payload]];
                    response = await model.invoke(input);
                    msg.payload = response.content;
                }

                msg.rawResponse = response;

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
    RED.nodes.registerType("ollama-chat", ChatOllamaNode);
};
const { OllamaEmbeddings } = require('@langchain/ollama');

module.exports = function (RED) {
    function OllamaEmbeddingsNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.baseUrl = config.baseUrl || 'http://localhost:11434';
        node.model = config.model || 'mxbai-embed-large';

        const embeddings = new OllamaEmbeddings({
            baseUrl: node.baseUrl,
            model: node.model
        });

        node.on('input', async function (msg, send, done) {
            node.status({ fill: "blue", shape: "dot", text: "embedding..." });

            try {
                const text = msg.payload;

                if (!text) {
                    node.warn("Empty payload received, nothing to embed.");
                    node.status({ fill: "yellow", shape: "ring", text: "empty payload" });
                    if (done) done();
                    return;
                }

                const textToEmbed = Array.isArray(text) ? text.join('\n') : text.toString();
                const embedding = await embeddings.embedQuery(textToEmbed);

                msg.payload = embedding;
                msg.embeddingDimension = embedding.length;

                node.status({ fill: "green", shape: "dot", text: `embedded (${embedding.length} dims)` });
                send(msg);

            } catch (error) {
                node.status({ fill: "red", shape: "ring", text: "error" });
                node.error("Embedding generation failed: " + error.message, msg);
            }

            if (done) done();
        });
    }

    RED.nodes.registerType("ollama-embeddings", OllamaEmbeddingsNode);
};

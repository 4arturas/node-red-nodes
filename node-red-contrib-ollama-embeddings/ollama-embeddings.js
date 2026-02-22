const { OllamaEmbeddings } = require('@langchain/ollama');

module.exports = function (RED) {
    function OllamaEmbeddingsNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.baseUrl = config.baseUrl || 'http://localhost:11434';
        node.model = config.model || 'mxbai-embed-large';

        // Create embeddings instance once and reuse it
        const embeddings = new OllamaEmbeddings({
            baseUrl: node.baseUrl,
            model: node.model
        });

        // Store embeddings instance on the node for access by other nodes
        node.embeddings = embeddings;

        node.on('input', async function (msg, send, done) {
            node.status({ fill: "blue", shape: "dot", text: "embedding..." });

            try {
                const input = msg.payload;

                // Handle empty payload
                if (input === null || input === undefined) {
                    node.warn("Empty payload received, nothing to embed.");
                    node.status({ fill: "yellow", shape: "ring", text: "empty payload" });
                    if (done) done();
                    return;
                }

                // Pass embeddings instance to output for use by FAISS node
                msg.embeddings = embeddings;

                // Handle array of documents (from text-splitter output)
                if (Array.isArray(input)) {
                    // Preserve original documents with metadata
                    const docs = input.map(item => {
                        if (typeof item === 'object' && item.pageContent !== undefined) {
                            return {
                                pageContent: item.pageContent,
                                metadata: item.metadata || {}
                            };
                        }
                        return {
                            pageContent: String(item),
                            metadata: {}
                        };
                    });

                    const texts = docs.map(doc => doc.pageContent);
                    const embeddings_result = await embeddings.embedDocuments(texts);

                    // Attach embeddings to each document
                    msg.documents = docs.map((doc, i) => ({
                        ...doc,
                        embedding: embeddings_result[i]
                    }));
                    msg.payload = embeddings_result;
                    msg.embeddingCount = embeddings_result.length;
                    node.status({ fill: "green", shape: "dot", text: `embedded ${embeddings_result.length} docs` });
                } else {
                    // Single text embedding
                    const textToEmbed = typeof input === 'object' && input.pageContent !== undefined
                        ? input.pageContent
                        : String(input);

                    const embedding = await embeddings.embedQuery(textToEmbed);
                    msg.payload = embedding;
                    msg.embeddingDimension = embedding.length;
                    node.status({ fill: "green", shape: "dot", text: `embedded (${embedding.length} dims)` });
                }

                send(msg);

            } catch (error) {
                node.status({ fill: "red", shape: "ring", text: "error" });
                node.error("Embedding generation failed: " + error.message, msg);
            }

            if (done) done();
        });
    }

    RED.nodes.registerType("ollama-emb", OllamaEmbeddingsNode);
};

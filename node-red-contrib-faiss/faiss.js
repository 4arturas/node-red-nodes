const { FaissStore } = require('@langchain/community/vectorstores/faiss');
const { Document } = require('@langchain/core/documents');

module.exports = function (RED) {
    function FaissStoreNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.operation = config.operation || 'add';
        node.persistPath = config.persistPath || './faiss_index';
        node.k = parseInt(config.k) || 5;

        let vectorStore = null;

        node.on('input', async function (msg, send, done) {
            node.status({ fill: "blue", shape: "dot", text: "processing..." });

            try {
                const embeddings = msg.embeddings;

                if (!embeddings && node.operation === 'add') {
                    node.warn("msg.embeddings required for add operation");
                    node.status({ fill: "yellow", shape: "ring", text: "missing embeddings" });
                    if (done) done();
                    return;
                }

                if (node.operation === 'add') {
                    let docs;

                    // Handle documents with embeddings from ollama-emb node
                    if (msg.documents && Array.isArray(msg.documents)) {
                        docs = msg.documents.map(d => new Document({
                            pageContent: d.pageContent,
                            metadata: d.metadata || {}
                        }));
                    } else if (Array.isArray(msg.payload)) {
                        // Handle array of documents (from text-splitter output)
                        docs = msg.payload.map(item => {
                            if (typeof item === 'object' && item.pageContent !== undefined) {
                                return new Document({
                                    pageContent: item.pageContent,
                                    metadata: item.metadata || {}
                                });
                            } else {
                                return new Document({
                                    pageContent: String(item),
                                    metadata: {}
                                });
                            }
                        });
                    } else if (msg.documents) {
                        docs = msg.documents;
                    } else {
                        docs = [new Document({
                            pageContent: msg.payload,
                            metadata: msg.metadata || {}
                        })];
                    }

                    if (!vectorStore) {
                        vectorStore = await FaissStore.fromDocuments(docs, embeddings);
                    } else {
                        await vectorStore.addDocuments(docs);
                    }

                    await vectorStore.save(node.persistPath);

                    msg.payload = `Added ${docs.length} document(s) to FAISS index`;
                    msg.documentCount = docs.length;
                    node.status({ fill: "green", shape: "dot", text: `added ${docs.length} docs` });

                } else if (node.operation === 'search') {
                    if (!vectorStore) {
                        try {
                            vectorStore = await FaissStore.load(node.persistPath, embeddings);
                        } catch (err) {
                            node.error("FAISS index not found. Add documents first.", msg);
                            node.status({ fill: "red", shape: "ring", text: "index not found" });
                            if (done) done();
                            return;
                        }
                    }

                    const queryEmbedding = msg.payload;
                    const results = await vectorStore.similaritySearchVectorWithScore(queryEmbedding, node.k);

                    msg.payload = results.map(([doc, score]) => ({
                        pageContent: doc.pageContent,
                        metadata: doc.metadata,
                        score: score
                    }));
                    msg.searchResults = msg.payload;

                    node.status({ fill: "green", shape: "dot", text: `found ${results.length} results` });

                } else if (node.operation === 'save') {
                    if (vectorStore) {
                        await vectorStore.save(node.persistPath);
                        msg.payload = 'FAISS index saved successfully';
                    } else {
                        msg.payload = 'No index to save';
                    }
                    node.status({ fill: "green", shape: "dot", text: 'saved' });
                }

                send(msg);

            } catch (error) {
                node.status({ fill: "red", shape: "ring", text: "error" });
                node.error("FAISS operation failed: " + error.message, msg);
            }

            if (done) done();
        });
    }

    RED.nodes.registerType("faiss-store", FaissStoreNode);
};

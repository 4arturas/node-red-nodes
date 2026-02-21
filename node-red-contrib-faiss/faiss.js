const { FaissStore } = require('@langchain/community/vectorstores/faiss');

module.exports = function (RED) {
    function FaissStoreNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.operation = config.operation || 'add';
        node.persistPath = config.persistPath || './faiss_index';
        node.k = parseInt(config.k) || 5;

        let vectorStore = null;

        async function getVectorStore(embeddings) {
            if (vectorStore) {
                return vectorStore;
            }

            try {
                vectorStore = await FaissStore.load(node.persistPath, embeddings);
                node.log('Loaded existing FAISS index');
            } catch {
                vectorStore = new FaissStore(embeddings, {});
                node.log('Created new FAISS index');
            }

            return vectorStore;
        }

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
                    const docs = msg.documents || [{ pageContent: msg.payload, metadata: msg.metadata || {} }];

                    if (!vectorStore) {
                        vectorStore = await FaissStore.fromDocuments(docs, embeddings);
                    } else {
                        await vectorStore.addDocuments(docs);
                    }

                    await vectorStore.save(node.persistPath);

                    msg.payload = `Added ${docs.length} document(s) to FAISS index`;
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

import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { Document } from "@langchain/core/documents";
import pg from "pg";

export default function (RED) {
    function PgVectorStoreNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        // Connection details from your podman command
        const pgConfig = {
            host: "localhost",
            port: 6024,
            user: "langchain",
            password: "langchain",
            database: "langchain",
        };

        node.on('input', async function (msg, send, done) {
            node.status({ fill: "blue", shape: "dot", text: "connecting..." });

            try {
                const embeddings = msg.embeddings;
                if (!embeddings) {
                    throw new Error("msg.embeddings is required");
                }

                // Initialize the store
                const vectorStore = await PGVectorStore.initialize(embeddings, {
                    postgresConnectionOptions: pgConfig,
                    tableName: config.tableName || "embeddings",
                    columns: {
                        idColumnName: "id",
                        vectorColumnName: "embedding",
                        contentColumnName: "text",
                        metadataColumnName: "metadata",
                    },
                });

                if (config.operation === 'add') {
                    const docs = Array.isArray(msg.payload)
                        ? msg.payload.map(content => new Document({ pageContent: String(content), metadata: msg.metadata || {} }))
                        : [new Document({ pageContent: String(msg.payload), metadata: msg.metadata || {} })];

                    await vectorStore.addDocuments(docs);
                    msg.payload = `Indexed ${docs.length} documents.`;
                    node.status({ fill: "green", shape: "dot", text: "success: added" });

                } else if (config.operation === 'search') {
                    // Search requires the raw query string or a vector
                    const results = await vectorStore.similaritySearch(msg.payload, parseInt(config.k) || 5);
                    msg.payload = results;
                    node.status({ fill: "green", shape: "dot", text: `found ${results.length} results` });
                }

                send(msg);
            } catch (error) {
                node.status({ fill: "red", shape: "ring", text: "error" });
                node.error(error.message, msg);
            }
            if (done) done();
        });
    }
    RED.nodes.registerType("pgvector", PgVectorStoreNode);
};
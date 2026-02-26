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
                    if (msg.documents && Array.isArray(msg.documents) && msg.documents.length > 0 && msg.documents[0].embedding) {
                        // Support pre-embedded documents to avoid redundant API calls
                        const vectors = msg.documents.map(d => d.embedding);
                        const documents = msg.documents.map(d => new Document({
                            pageContent: d.pageContent,
                            metadata: d.metadata || {}
                        }));
                        await vectorStore.addVectors(vectors, documents);
                        msg.payload = `Indexed ${documents.length} documents (pre-embedded).`;
                        node.status({ fill: "green", shape: "dot", text: `added ${documents.length} docs` });
                    } else {
                        let docs;
                        if (msg.documents && Array.isArray(msg.documents)) {
                            docs = msg.documents.map(d => new Document({
                                pageContent: d.pageContent,
                                metadata: d.metadata || {}
                            }));
                        } else if (typeof msg.payload === 'string') {
                            docs = [new Document({ pageContent: msg.payload, metadata: msg.metadata || {} })];
                        } else if (Array.isArray(msg.payload)) {
                            // Check if it's a vector (array of numbers) or array of documents
                            if (msg.payload.length > 0 && typeof msg.payload[0] === 'number') {
                                // If it's a vector, we need the original text
                                const text = msg.originalPayload || String(msg.payload); // Fallback
                                docs = [new Document({ pageContent: String(text), metadata: msg.metadata || {} })];
                            } else {
                                docs = msg.payload.map(content => {
                                    if (typeof content === 'object' && content.pageContent) {
                                        return new Document({ pageContent: String(content.pageContent), metadata: content.metadata || {} });
                                    }
                                    return new Document({ pageContent: String(content), metadata: msg.metadata || {} });
                                });
                            }
                        } else {
                            docs = [new Document({ pageContent: String(msg.payload), metadata: msg.metadata || {} })];
                        }

                        await vectorStore.addDocuments(docs);
                        msg.payload = `Indexed ${docs.length} documents.`;
                        node.status({ fill: "green", shape: "dot", text: `added ${docs.length} docs` });
                    }

                } else if (config.operation === 'search') {
                    let results;
                    // If payload is an array of numbers, treat as vector search
                    if (Array.isArray(msg.payload) && msg.payload.length > 0 && typeof msg.payload[0] === 'number') {
                        results = await vectorStore.similaritySearchVectorWithScore(msg.payload, parseInt(config.k) || 5);
                        msg.payload = results.map(([doc, score]) => ({
                            pageContent: doc.pageContent,
                            metadata: doc.metadata,
                            score: score
                        }));
                    } else {
                        // Otherwise treat as text search
                        results = await vectorStore.similaritySearch(String(msg.payload), parseInt(config.k) || 5);
                        msg.payload = results.map(doc => ({
                            pageContent: doc.pageContent,
                            metadata: doc.metadata
                        }));
                    }
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
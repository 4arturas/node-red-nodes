const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');

module.exports = function (RED) {
    function TextSplitterNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.chunkSize = parseInt(config.chunkSize) || 1000;
        node.chunkOverlap = parseInt(config.chunkOverlap) || 100;
        node.separator = config.separator || '\n\n';
        node.outputFormat = config.outputFormat || 'array';

        node.on('input', async function (msg, send, done) {
            try {
                const input = msg.payload;

                if (!input) {
                    node.warn("Empty payload received, nothing to split.");
                    node.status({ fill: "yellow", shape: "ring", text: "empty payload" });
                    if (done) done();
                    return;
                }

                // Parse separators: convert escape sequences like \n to actual newlines
                let separators = ['\n\n', '\n', ' ', ''];
                if (node.separator) {
                    separators = node.separator
                        .split('|')
                        .map(s => s
                            .replace(/\\n/g, '\n')
                            .replace(/\\r/g, '\r')
                            .replace(/\\t/g, '\t')
                        );
                }

                const splitter = new RecursiveCharacterTextSplitter({
                    chunkSize: node.chunkSize,
                    chunkOverlap: node.chunkOverlap,
                    separators: separators
                });

                let chunks;
                let metadata = msg.metadata || {};

                // Check if input is a LangChain document object (has pageContent and metadata)
                if (typeof input === 'object' && input.pageContent !== undefined) {
                    metadata = input.metadata || {};
                    const text = input.pageContent;
                    chunks = await splitter.splitText(text);
                } else if (typeof input === 'string') {
                    chunks = await splitter.splitText(input);
                } else {
                    chunks = await splitter.splitText(String(input));
                }

                if (!Array.isArray(chunks)) {
                    node.warn("Splitting did not return an array");
                    node.status({ fill: "red", shape: "ring", text: "invalid result" });
                    if (done) done();
                    return;
                }

                // Convert chunks to document format with metadata
                const docs = chunks.map(chunk => ({
                    pageContent: chunk,
                    metadata: { ...metadata }
                }));

                if (node.outputFormat === 'array') {
                    msg.payload = docs;
                    msg.chunkCount = docs.length;
                } else {
                    msg.payload = docs[0] || { pageContent: '', metadata: {} };
                    msg.chunks = docs;
                    msg.chunkCount = docs.length;
                }

                node.status({ fill: "green", shape: "dot", text: `split into ${docs.length} chunks` });
                send(msg);

            } catch (error) {
                node.status({ fill: "red", shape: "ring", text: "error" });
                node.error("Text splitting failed: " + error.message, msg);
            }

            if (done) done();
        });
    }

    RED.nodes.registerType("text-splitter", TextSplitterNode);
};

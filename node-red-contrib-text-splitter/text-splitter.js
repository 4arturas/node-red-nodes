const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');

module.exports = function (RED) {
    function TextSplitterNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.chunkSize = parseInt(config.chunkSize) || 1000;
        node.chunkOverlap = parseInt(config.chunkOverlap) || 100;
        node.separator = config.separator || '\n\n';
        node.outputFormat = config.outputFormat || 'array';

        node.on('input', function (msg, send, done) {
            try {
                const text = msg.payload;

                if (!text) {
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

                const chunks = splitter.splitText(text.toString());

                if (node.outputFormat === 'array') {
                    msg.payload = chunks;
                    msg.chunkCount = chunks.length;
                } else {
                    msg.payload = chunks[0] || '';
                    msg.chunks = chunks;
                    msg.chunkCount = chunks.length;
                }

                node.status({ fill: "green", shape: "dot", text: `split into ${chunks.length} chunks` });
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

const { CLIPVisionModelWithProjection, CLIPTextModelWithProjection, AutoProcessor, AutoTokenizer, RawImage } = require('@xenova/transformers');

module.exports = function (RED) {
    function ImageEmbeddingNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.modelName = config.model || 'Xenova/clip-vit-base-patch32';
        node.status({ fill: "grey", shape: "ring", text: "loading models..." });

        let processor = null;
        let tokenizer = null;
        let visionModel = null;
        let textModel = null;

        const loadModel = async () => {
            try {
                processor = await AutoProcessor.from_pretrained(node.modelName);
                tokenizer = await AutoTokenizer.from_pretrained(node.modelName);
                visionModel = await CLIPVisionModelWithProjection.from_pretrained(node.modelName);
                textModel = await CLIPTextModelWithProjection.from_pretrained(node.modelName);
                node.status({ fill: "green", shape: "dot", text: "models loaded" });
            } catch (err) {
                node.error("Failed to load models: " + err.message);
                node.status({ fill: "red", shape: "ring", text: "model error" });
            }
        };

        loadModel();

        node.on('input', async function (msg, send, done) {
            if (!processor || !visionModel || !tokenizer || !textModel) {
                node.error("Models not loaded yet", msg);
                if (done) done();
                return;
            }

            node.status({ fill: "blue", shape: "dot", text: "embedding..." });

            try {
                let input = msg.payload;
                const isString = typeof input === 'string';
                const isBuf = Buffer.isBuffer(input);

                // Detect if it's text or image
                // If it's a string but doesn't look like a URL or Data URL, treat as text
                const isText = isString && !input.startsWith('http') && !input.startsWith('data:') && !input.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i);

                let embedding;
                if (isText) {
                    node.debug(`Processing as text: ${input.substring(0, 20)}...`);
                    const inputs = await tokenizer(input, { padding: true, truncation: true });
                    const { text_embeds } = await textModel(inputs);
                    embedding = text_embeds;
                } else {
                    node.debug(`Processing as image. Input type: ${typeof input}, isBuffer: ${isBuf}`);
                    let image;
                    if (isBuf && msg.filename && typeof msg.filename === 'string') {
                        try {
                            image = await RawImage.read(msg.filename);
                        } catch (e) {
                            image = await RawImage.read(new Uint8Array(input));
                        }
                    } else {
                        image = await RawImage.read(isBuf ? new Uint8Array(input) : input);
                    }
                    const inputs = await processor(image);
                    const { image_embeds } = await visionModel(inputs);
                    embedding = image_embeds;
                }

                if (embedding && embedding.data) {
                    msg.payload = Array.from(embedding.data);
                    msg.embeddingDimension = embedding.size;
                } else {
                    throw new Error("Failed to extract embeddings");
                }

                node.status({ fill: "green", shape: "dot", text: "done" });
                send(msg);
            } catch (err) {
                node.error("Embedding failed: " + err.message, msg);
                node.status({ fill: "red", shape: "ring", text: "error" });
            }

            if (done) done();
        });
    }

    RED.nodes.registerType("image-embedding", ImageEmbeddingNode);
};

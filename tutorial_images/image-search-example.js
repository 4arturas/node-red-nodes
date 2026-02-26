const { CLIPVisionModelWithProjection, AutoProcessor, RawImage } = require('@xenova/transformers');
const fs = require('fs');
const path = require('path');

// Configuration
const MODEL_NAME = 'Xenova/clip-vit-base-patch32';
const IMAGE_DIR = '.';
const SEARCH_QUERY_IMAGE_URL = 'https://upload.wikimedia.org/wikipedia/commons/3/3a/Cat03.jpg';

async function runExample() {
    console.log(`Loading model and processor: ${MODEL_NAME}...`);

    // Explicitly load vision model and processor
    const processor = await AutoProcessor.from_pretrained(MODEL_NAME);
    const visionModel = await CLIPVisionModelWithProjection.from_pretrained(MODEL_NAME);

    // 1. Indexing: Load and embed local images
    const images = ['cat.png', 'dog.png', 'pizza.png'];
    const index = [];

    console.log('\n--- Indexing Images ---');
    for (const filename of images) {
        const filePath = path.join(IMAGE_DIR, filename);
        if (!fs.existsSync(filePath)) {
            console.error(`File NOT found: ${filePath}`);
            continue;
        }

        console.log(`Processing ${filePath}...`);

        // Read image
        const image = await RawImage.read(filePath);

        // Preprocess - simplest form for single image
        console.log(`Preprocessing image...`);
        const inputs = await processor(image);

        console.log('Inputs keys:', Object.keys(inputs));

        // Generate embedding
        const { image_embeds } = await visionModel(inputs);
        const embedding = Array.from(image_embeds.data);

        index.push({ filename, embedding });
        console.log(`Indexed ${filename} (${embedding.length} dimensions)`);
    }

    // 2. Searching: Embed a new image from URL and compare
    console.log('\n--- Searching ---');
    console.log(`Retrieving query image from URL: ${SEARCH_QUERY_IMAGE_URL}...`);

    try {
        const queryImage = await RawImage.read(SEARCH_QUERY_IMAGE_URL);
        const queryInputs = await processor(queryImage);
        const { image_embeds: queryOutput } = await visionModel(queryInputs);
        const queryEmbedding = Array.from(queryOutput.data);

        // Manual Cosine Similarity Calculation
        const dotProduct = (a, b) => a.reduce((sum, val, i) => sum + val * b[i], 0);
        const magnitude = (arr) => Math.sqrt(arr.reduce((sum, val) => sum + val * val, 0));
        const cosineSimilarity = (a, b) => dotProduct(a, b) / (magnitude(a) * magnitude(b));

        const results = index.map(item => ({
            filename: item.filename,
            score: cosineSimilarity(queryEmbedding, item.embedding)
        })).sort((a, b) => b.score - a.score);

        console.log('\nSearch Results:');
        results.forEach((res, i) => {
            console.log(`${i + 1}. ${res.filename} - Score: ${res.score.toFixed(4)}`);
        });
    } catch (err) {
        console.error('Search failed:', err.message);
    }
}

runExample().catch(err => {
    console.error('Fatal Error:', err);
});

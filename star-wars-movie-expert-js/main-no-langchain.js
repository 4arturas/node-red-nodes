import { createOllamaEmbeddings } from './ollama-embeddings.js';
import { createOllamaChat } from './ollama-chat.js';
import { createFaissStore, loadFaissStore } from './faiss-store.js';
import { createTextSplitter } from './text-splitter.js';
import { createCheerioLoader } from './cheerio-loader.js';
import { existsSync } from "fs";
import readline from "readline";

const PERSIST_PATH = "./faiss_index";

// Scripts to index
const starWarsScripts = [
  {
    title: "Star Wars: A New Hope",
    url: "https://www.imsdb.com/scripts/Star-Wars-A-New-Hope.html"
  },
  {
    title: "Star Wars: The Empire Strikes Back",
    url: "https://www.imsdb.com/scripts/Star-Wars-The-Empire-Strikes-Back.html"
  },
  {
    title: "Star Wars: Return of the Jedi",
    url: "https://www.imsdb.com/scripts/Star-Wars-Return-of-the-Jedi.html"
  }
];

const template = `
You are a Star Wars Movie Script Expert. Use ONLY the following script excerpts to answer.
If the answer isn't in the context, say "There is no information about this in the original Star Wars scripts."

Context:
{context}

Question:
{question}

Answer:`;

const askQuestion = (rl) => {
  return new Promise((resolve) => {
    rl.question("You: ", resolve);
  });
};

async function main() {
  const embeddings = createOllamaEmbeddings({ model: "mxbai-embed-large" });

  let vectorstore;

  if (existsSync(PERSIST_PATH)) {
    vectorstore = await loadFaissStore(PERSIST_PATH, embeddings);
    console.log("Loaded existing FAISS index");
  } else {
    console.log("Existing index not found, will create new one...");

    console.log("Loading scripts from web...");
    const loadedDocs = [];

    for (const script of starWarsScripts) {
      console.log(`Loading: ${script.title}...`);
      const loader = createCheerioLoader(script.url);
      const docs = await loader.load();

      if (docs.length > 0) {
        docs[0].metadata.title = script.title;
        loadedDocs.push(docs[0]);
      }
    }

    console.log(`Loaded ${loadedDocs.length} scripts.`);

    console.log("Splitting documents into chunks...");
    const allChunks = [];

    const textSplitter = createTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 100,
      addStartIndex: true,
      separators: ["\nINT.", "\nEXT.", "\n\n", "\n", " ", ""],
    });

    for (const doc of loadedDocs) {
      const chunks = await textSplitter.splitDocuments([doc]);
      allChunks.push(...chunks);
      console.log(`Split "${doc.metadata.title}" into ${chunks.length} chunks.`);
    }

    console.log(`Total: ${allChunks.length} chunks.`);

    console.log("Creating vector store from all chunks...");
    vectorstore = await createFaissStore(allChunks, embeddings);
    await vectorstore.save(PERSIST_PATH);
    console.log("Vector store created and saved successfully!");
  }

  const retriever = vectorstore.asRetriever({ k: 5 });

  // Interactive loop
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const llm = createOllamaChat({ model: "qwen2.5:7b", temperature: 0 });

  console.log("\n--- The Star Wars Movie Expert is ready to answer your questions ---");
  console.log("Type 'exit' or 'quit' to stop.\n");

  try {
    while (true) {
      const query = await askQuestion(rl);

      if (["exit", "quit"].includes(query.toLowerCase())) {
        console.log("May the Force be with you! Goodbye.");
        rl.close();
        break;
      }

      const context = await retriever.invoke(query);
      
      // Build prompt from template
      const prompt = template
        .replace('{context}', context.map(doc => doc.pageContent).join("\n\n"))
        .replace('{question}', query);

      const response = await llm.invoke(prompt);
      console.log(`\nStar Wars Movie Expert: ${response}\n`);
    }
  } catch (error) {
    console.error("Error:", error.message);
    rl.close();
    process.exit(1);
  }
}

main();

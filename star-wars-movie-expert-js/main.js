import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { OllamaEmbeddings, ChatOllama } from "@langchain/ollama";
import readline from "readline";

const PERSIST_PATH = "./faiss_index";

async function main() {
  const embeddings = new OllamaEmbeddings({ model: "mxbai-embed-large" });
  const llm = new ChatOllama({ model: "qwen2.5:7b", temperature: 0 });

  // Try to load existing FAISS index
  let vectorstore;
  try {
    vectorstore = await FaissStore.load(PERSIST_PATH, embeddings);
    console.log("Loaded existing FAISS index");
  } catch {
    console.log("Existing index not found, will create new one...");

    // Scripts to index
    const starWarsScripts = [
      {
        title: "Star Wars: A New Hope",
        url: "https://www.imsdb.com/scripts/Star-Wars-A-New-Hope.html",
      },
      {
        title: "Star Wars: The Empire Strikes Back",
        url: "https://www.imsdb.com/scripts/Star-Wars-The-Empire-Strikes-Back.html",
      },
      {
        title: "Star Wars: Return of the Jedi",
        url: "https://www.imsdb.com/scripts/Star-Wars-Return-of-the-Jedi.html",
      },
    ];

    const allChunks = [];

    // Load and process each script
    for (const script of starWarsScripts) {
      console.log(`Loading script: ${script.title}...`);
      const loader = new CheerioWebBaseLoader(script.url);
      const docs = await loader.load();

      if (docs.length > 0) {
        docs[0].metadata.title = script.title;
      }

      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 100,
        addStartIndex: true,
        separators: ["\nINT.", "\nEXT.", "\n\n", "\n", " ", ""],
      });

      const chunks = await textSplitter.splitDocuments(docs);
      allChunks.push(...chunks);
      console.log(`Loaded and split "${script.title}" into ${chunks.length} chunks.`);
    }

    // Create and save vector store
    console.log("Creating vector store from all chunks...");
    vectorstore = await FaissStore.fromDocuments(allChunks, embeddings);
    await vectorstore.save(PERSIST_PATH);
    console.log("Vector store created and saved successfully!");
  }

  // Create retriever
  const retriever = vectorstore.asRetriever({ k: 5 });

  // Create RAG chain
  const template = `
You are a Star Wars Movie Script Expert. Use ONLY the following script excerpts to answer.
If the answer isn't in the context, say "There is no information about this in the original Star Wars scripts."

Context:
{context}

Question:
{question}

Answer:`;

  const prompt = ChatPromptTemplate.fromTemplate(template);
  const ragChain = prompt.pipe(llm).pipe(new StringOutputParser());

  // Interactive loop
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("\n--- The Star Wars Movie Expert is ready to answer your questions ---");
  console.log("Type 'exit' or 'quit' to stop.\n");

  const askQuestion = () => {
    return new Promise((resolve) => {
      rl.question("You: ", resolve);
    });
  };

  try {
    while (true) {
      const query = await askQuestion();

      if (["exit", "quit"].includes(query.toLowerCase())) {
        console.log("May the Force be with you! Goodbye.");
        rl.close();
        break;
      }

      const context = await retriever.invoke(query);
      const response = await ragChain.invoke({
        context: context.map(doc => doc.pageContent).join("\n\n"),
        question: query
      });
      console.log(`\nStar Wars Movie Expert: ${response}\n`);
    }
  } catch (error) {
    console.error("Error:", error.message);
    rl.close();
    process.exit(1);
  }
}

main();

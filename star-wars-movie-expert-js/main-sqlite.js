import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { OllamaEmbeddings, ChatOllama } from "@langchain/ollama";
import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import readline from "readline";

const DB_PATH = "star_wars_vectors.db";

// Global variable - scripts to index
const starWarsScripts = [
    {
        "title": "Star Wars: A New Hope",
        "url": "https://www.imsdb.com/scripts/Star-Wars-A-New-Hope.html"
    },
    {
        "title": "Star Wars: The Empire Strikes Back",
        "url": "https://www.imsdb.com/scripts/Star-Wars-The-Empire-Strikes-Back.html"
    },
    {
        "title": "Star Wars: Return of the Jedi",
        "url": "https://www.imsdb.com/scripts/Star-Wars-Return-of-the-Jedi.html"
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

function initDb() {
    const db = new Database(DB_PATH);
    sqliteVec.load(db);

    db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT,
      title TEXT,
      startIndex INTEGER
    );
    CREATE VIRTUAL TABLE IF NOT EXISTS vec_documents USING vec0(
      embedding float[1024]
    );
  `);

    return db;
}

async function indexDocuments(db, embeddings) {
    const rowCount = db.prepare("SELECT count(*) as count FROM documents").get().count;
    if (rowCount > 0) {
        console.log(`Database already contains ${rowCount} documents. Skipping indexing.`);
        return;
    }

    console.log("Loading scripts from web...");
    const loadedDocs = [];

    for (const script of starWarsScripts) {
        console.log(`Loading: ${script.title}...`);
        try {
            const loader = new CheerioWebBaseLoader(script.url);
            const docs = await loader.load();

            if (docs.length > 0) {
                docs[0].metadata.title = script.title;
                loadedDocs.push(docs[0]);
            }
        } catch (e) {
            console.error(`Failed to load ${script.title}: ${e.message}`);
        }
    }

    console.log(`Loaded ${loadedDocs.length} scripts.`);

    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 100,
        addStartIndex: true,
        separators: ["\nINT.", "\nEXT.", "\n\n", "\n", " ", ""],
    });

    const allChunks = [];
    for (const doc of loadedDocs) {
        const chunks = await textSplitter.splitDocuments([doc]);
        allChunks.push(...chunks);
        console.log(`Split "${doc.metadata.title}" into ${chunks.length} chunks.`);
    }

    console.log(`Total: ${allChunks.length} chunks. Indexing into SQLite...`);

    const insertDoc = db.prepare("INSERT INTO documents (content, title, startIndex) VALUES (?, ?, ?)");
    const insertVec = db.prepare("INSERT INTO vec_documents (rowid, embedding) VALUES (?, vec_f32(?))");

    for (const chunk of allChunks) {
        const info = insertDoc.run(
            chunk.pageContent,
            chunk.metadata.title,
            chunk.metadata.startIndex
        );

        const docId = info.lastInsertRowid;
        const embedding = await embeddings.embedQuery(chunk.pageContent);

        // SQLite-vec expects a Buffer/Float32Array for the vector
        const vectorBuffer = Buffer.from(new Float32Array(embedding).buffer);
        insertVec.run(BigInt(docId), vectorBuffer);
    }

    console.log("Indexing complete!");
}

async function searchVectors(db, embeddings, query, k = 5) {
    const embedding = await embeddings.embedQuery(query);
    const vectorBuffer = Buffer.from(new Float32Array(embedding).buffer);

    const results = db.prepare(`
    SELECT 
      d.content, 
      d.title,
      v.distance 
    FROM documents d 
    JOIN vec_documents v ON d.id = v.rowid 
    WHERE v.embedding MATCH vec_f32(?) 
    AND k = ? 
    ORDER BY v.distance
  `).all(vectorBuffer, k);

    return results;
}

async function main() {
    const embeddings = new OllamaEmbeddings({ model: "mxbai-embed-large" });
    const db = initDb();

    await indexDocuments(db, embeddings);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    console.log("\n--- The Star Wars Movie Expert (SQLite) is ready to answer your questions ---");
    console.log("Type 'exit' or 'quit' to stop.\n");

    const askQuestion = () => {
        return new Promise((resolve) => {
            rl.question("You: ", resolve);
        });
    };

    const prompt = ChatPromptTemplate.fromTemplate(template);
    const llm = new ChatOllama({ model: "qwen2.5:7b", temperature: 0 });
    const ragChain = prompt.pipe(llm).pipe(new StringOutputParser());

    try {
        while (true) {
            const query = await askQuestion();

            if (["exit", "quit"].includes(query.toLowerCase())) {
                console.log("May the Force be with you! Goodbye.");
                db.close();
                rl.close();
                break;
            }

            const contextDocs = await searchVectors(db, embeddings, query);
            const contextText = contextDocs.map(doc => `[Source: ${doc.title}]\n${doc.content}`).join("\n\n");

            const response = await ragChain.invoke({
                context: contextText,
                question: query
            });

            console.log(`\nStar Wars Movie Expert: ${response}\n`);
        }
    } catch (error) {
        console.error("Error:", error.message);
        db.close();
        rl.close();
        process.exit(1);
    }
}

main();

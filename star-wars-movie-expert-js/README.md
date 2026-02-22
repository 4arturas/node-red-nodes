

```sh
npm install @langchain/core
````
```sh
npm install  @langchain/community @langchain/ollama @langchain/textsplitters
````

```sh
npm install @langchain/qdrant qdrant-client
````

```sh
npm install axios cheerio dotenv
````

# ⭐ Star Wars Movie Script Expert (JavaScript)

A minimal Retrieval-Augmented Generation (RAG) example built with **LangChain.js** and **FAISS** that scrapes original Star Wars movie scripts, splits them into chunks, stores embeddings in a local FAISS index, and answers user questions using a Chat LLM constrained to only cite the script content.

---

## 🚀 Features

- Scrapes scripts for the original trilogy from IMSDb
- Splits scripts into searchable chunks using a text splitter
- Stores and indexes embeddings in a local FAISS index (no server required!)
- Uses Ollama (qwen2.5:7b) embeddings + Chat model to answer queries using only script context
- **Functional approach** - clean, simple async/await flow
- **No Docker required** - FAISS runs locally with file persistence

---

## 🧭 Quickstart

### Prerequisites

- **Node.js 18+**
- **Ollama** installed and running locally
- Required Ollama models:
  - `qwen2.5:7b` - for chat completion
  - `mxbai-embed-large` - for embeddings

Install Ollama models:

```bash
ollama pull qwen2.5:7b
ollama pull mxbai-embed-large
```

**No Docker or external vector database server required!** FAISS runs locally with file persistence.

### Install

1. Clone or navigate to the project directory

2. Install dependencies:

```bash
npm install
```

### Environment Setup

No API key required! Ollama runs locally. If you need to customize Ollama endpoint, create a `.env` file:

```bash
OLLAMA_BASE_URL=http://localhost:11434
```

### Run the app

```bash
npm start
```

On first run, the script will download and index the scripts (this may take a while). After indexing, you'll see the prompt:

```
--- The Star Wars Movie Expert is ready to answer your questions ---
```

Type a question and press Enter. Type `exit` or `quit` to stop.

> Example: `Who says "I am your father"?`

---

## ⚙️ Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PERSIST_PATH` | Path to the FAISS index directory | `./faiss_index` |

Add or remove scripts by editing the `starWarsScripts` array in `main.js`.

**Models used:**
- Chat: `qwen2.5:7b`
- Embeddings: `mxbai-embed-large`

---

## 🏗️ Architecture

This project uses a simple **functional approach** with async/await control flow and **FAISS** for local vector storage.

### Flow

```
starWarsExpert()
  ├── initializeVectorStore() → try loading existing FAISS index
  ├── if not found:
  │   ├── loadStarWarsScript() → scrape each script
  │   ├── splitDocuments() → chunk documents
  │   └── createVectorStore() → create FAISS index
  │   └── save() → persist index to disk
  ├── create retriever
  └── build RAG chain
```

---

## 🛠️ Extending

- **Add more scripts**: Add entries to the `starWarsScripts` array in `main.js`
- **Swap models**: Change the `model` parameter in `ChatOllama` or `OllamaEmbeddings`
- **Use different embeddings**: Replace `OllamaEmbeddings` with other LangChain embedding providers
- **Change retriever k**: Adjust the `k` parameter in `asRetriever({ k: 5 })` to control how many chunks are retrieved

---

## ⚠️ Notes & Privacy

- The app scrapes public scripts from IMSDb — ensure you respect the source's terms of service when using scraped content.
- Questions are answered based only on the ingested script text. If an answer isn't present in the scripts, the assistant replies: _"There is no information about this in the original Star Wars scripts."_

---

## 📦 Dependencies

- `@langchain/core` - Core LangChain abstractions
- `@langchain/ollama` - Ollama chat model (qwen2.5:7b) and embeddings
- `@langchain/community` - CheerioWebBaseLoader for web scraping, FAISS vector store
- `@langchain/textsplitters` - Document splitting utilities
- `faiss-node` - FAISS library for Node.js (local vector storage)
- `cheerio` - HTML parsing (required by CheerioWebBaseLoader)

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome. Please open a PR or an issue describing the change.

---

## 📜 License

MIT

---

Happy exploring the galaxy far, far away! ✨

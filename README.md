# Node-RED Contrib Nodes for RAG

A collection of custom Node-RED nodes for building **Retrieval-Augmented Generation (RAG)** applications and other AI-powered workflows.

---

## 📦 Available Nodes

### Core RAG Nodes

| Node | Package | Description | Status |
|------|---------|-------------|--------|
| **ChatOllama** | `node-red-contrib-ollama-chat` | Chat with Ollama models (qwen2.5, llama3, etc.) | ✅ Ready |
| **Cheerio** | `node-red-contrib-cheerio` | Parse HTML and extract data using CSS selectors | ✅ Ready |
| **Text Splitter** | `node-red-contrib-text-splitter` | Split text into chunks for RAG indexing | ✅ Ready |
| **Ollama Embeddings** | `node-red-contrib-ollama-embeddings` | Generate embeddings using Ollama | ✅ Ready |
| **FAISS Store** | `node-red-contrib-faiss` | Local vector store for embeddings (no server required) | ✅ Ready |
| **RAG Chain** | `node-red-contrib-rag-chain` | Complete RAG pipeline with retriever and generator | 🚧 TODO |

### MCP (Model Context Protocol) Nodes

| Node | Package | Description | Status |
|------|---------|-------------|--------|
| **MCP Call Tool** | `node-red-contrib-mcp` | Call MCP server tools (filesystem, playwright, etc.) | ✅ Ready |
| **MCP List Tools** | `node-red-contrib-mcp` | List available tools from MCP server | ✅ Ready |
| **MCP Server Config** | `node-red-contrib-mcp` | Persistent MCP server configuration | ✅ Ready |

### Utility Nodes

| Node | Package | Description | Status |
|------|---------|-------------|--------|
| **Turndown** | `node-red-contrib-turndown` | Convert HTML to Markdown | ✅ Ready |

---

## 🚀 RAG Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        RAG Pipeline                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────┐      │
│  │  HTTP    │───▶│   Cheerio    │───▶│  Text Splitter   │      │
│  │ Request  │    │   (Parser)   │    │   (Chunking)     │      │
│  └──────────┘    └──────────────┘    └──────────────────┘      │
│                                              │                   │
│                                              ▼                   │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────┐      │
│  │  FAISS   │◀───│   Ollama     │◀───│    Documents     │      │
│  │  Store   │    │  Embeddings  │    │    (Chunks)      │      │
│  └──────────┘    └──────────────┘    └──────────────────┘      │
│       │                                                        │
│       ▼                                                        │
│  ┌──────────────────────────────────────────────────┐          │
│  │              RAG Chain                            │          │
│  │  ┌────────────┐    ┌────────────┐    ┌────────┐ │          │
│  │  │  Retriever │───▶│   Prompt   │───▶│ Chat   │ │          │
│  │  │  (FAISS)   │    │  Template  │    │ Ollama │ │          │
│  │  └────────────┘    └────────────┘    └────────┘ │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Installation

### Quick Install (Windows)

**Option 1: Batch Script (Command Prompt)**

```cmd
install.bat
```

**Option 2: PowerShell Script**

```powershell
.\install.ps1
```

### Quick Install (Linux/macOS)

```bash
./install.sh
```

---

These scripts will:
1. Build all node packages (`npm install` in each folder)
2. Install all nodes into Node-RED user directory

---

### Manual Installation

#### Windows (Command Prompt)

```cmd
cd C:\Users\4artu\.node-red
npm install C:\Users\4artu\IdeaProjects\node-red-nodes\node-red-contrib-ollama-chat
npm install C:\Users\4artu\IdeaProjects\node-red-nodes\node-red-contrib-cheerio
npm install C:\Users\4artu\IdeaProjects\node-red-nodes\node-red-contrib-text-splitter
npm install C:\Users\4artu\IdeaProjects\node-red-nodes\node-red-contrib-ollama-embeddings
npm install C:\Users\4artu\IdeaProjects\node-red-nodes\node-red-contrib-faiss
npm install C:\Users\4artu\IdeaProjects\node-red-nodes\node-red-contrib-mcp
npm install C:\Users\4artu\IdeaProjects\node-red-nodes\node-red-contrib-turndown
```

#### Linux/macOS

```bash
cd ~/.node-red

npm install /path/to/node-red-contrib-ollama-chat
npm install /path/to/node-red-contrib-cheerio
npm install /path/to/node-red-contrib-mcp
npm install /path/to/node-red-contrib-turndown
```

---

## 🔧 Prerequisites

### Ollama (Required for AI nodes)

1. Install Ollama from [https://ollama.ai](https://ollama.ai)
2. Pull required models:

```bash
ollama pull qwen2.5:7b        # Chat model
ollama pull mxbai-embed-large # Embeddings model
```

### Node-RED

```bash
npm install -g node-red
```

### Optional: Docker (for MCP nodes)

Some MCP servers may require Docker for isolation.

---

## 📖 Usage Examples

### Import Example Flows

A complete RAG example flow is included in this repository. To import:

1. Open Node-RED
2. Click the menu (☰) → **Import**
3. Select `flows-rag-example.json` from this repository
4. Click **Import**

The example includes 3 tabs:
- **RAG - Index Documents**: Scrapes web content and indexes it in FAISS
- **RAG - Query & Answer**: Answers questions using RAG
- **RAG - MCP Tools**: Demonstrates MCP tool calling

---

### Example 1: Simple RAG Question Answering

```
[HTTP Request] → [Cheerio] → [Text Splitter] → [Ollama Embeddings] → [FAISS Store]
                                                                       │
[User Question] → [Ollama Embeddings] → [FAISS Store (search)] ────────┤
                                                                       ▼
                                                            [RAG Chain] → [Response]
```

### Example 2: Web Scraping + AI Analysis

```
[HTTP Request] → [Cheerio] → [Turndown] → [ChatOllama] → [Response]
```

### Example 3: MCP Tool Calling

```
[Input] → [MCP List Tools] → [ChatOllama (decide)] → [MCP Call Tool] → [Output]
```

---

## 📋 Example Flows

### RAG Index Flow

```
[Inject URL] → [HTTP Request] → [Cheerio] → [Text Splitter] → [Split]
                                                      │
                                                      ▼
[FAISS Store] ← [Ollama Embeddings] ←─────────────────┘
```

**Description:** Scrapes a webpage, extracts text content, splits into chunks, generates embeddings for each chunk, and stores in FAISS vector store.

---

### RAG Query Flow

```
[Inject Question] → [Ollama Embeddings] → [FAISS Search] → [Build Context] → [ChatOllama] → [Answer]
```

**Description:** Takes a user question, generates embedding, searches FAISS for relevant context, builds prompt with context, and generates answer using ChatOllama.

---

### MCP Tools Flow

```
[Inject Topic] → [MCP List Tools] → [Debug: Available Tools]
                  [MCP Call Tool] → [Debug: Tool Result]
```

**Description:** Demonstrates MCP tool discovery and execution with Playwright MCP server.

---

## 🗂️ Node Catalog

### node-red-contrib-ollama-chat

Chat with Ollama models. Supports streaming and tool calling.

**Input:** `msg.payload` - String or message array
**Output:** `msg.payload` - AI response content

[View Documentation →](./node-red-contrib-ollama-chat/README.md)

---

### node-red-contrib-cheerio

Parse HTML and extract data using CSS selectors.

**Input:** `msg.payload` - HTML string  
**Output:** `msg.payload` - Extracted text/attribute

[View Documentation →](./node-red-contrib-cheerio/README.md)

---

### node-red-contrib-text-splitter

Split large texts into smaller chunks for RAG indexing using recursive character splitting.

**Input:** `msg.payload` - Text string  
**Output:** `msg.payload` - Array of chunks

[View Documentation →](./node-red-contrib-text-splitter/README.md)

---

### node-red-contrib-ollama-embeddings

Generate vector embeddings from text using Ollama embedding models.

**Input:** `msg.payload` - Text string  
**Output:** `msg.payload` - Embedding vector (number array)

[View Documentation →](./node-red-contrib-ollama-embeddings/README.md)

---

### node-red-contrib-faiss

Local FAISS vector store for embeddings with similarity search. No server required.

**Operations:** `add`, `search`, `save`  
**Input:** `msg.embeddings`, `msg.payload` (query embedding for search)  
**Output:** `msg.payload` - Search results with scores

[View Documentation →](./node-red-contrib-faiss/README.md)

---

### node-red-contrib-mcp

Model Context Protocol client for tool calling.

**Nodes:**
- `mcp-call-tool` - Call a specific tool
- `mcp-list-tools` - List available tools
- `mcp-server-config` - Persistent server configuration

[View Documentation →](./node-red-contrib-mcp/README.md)

---

### node-red-contrib-turndown

Convert HTML to Markdown format.

**Input:** `msg.payload` - HTML string  
**Output:** `msg.payload` - Markdown string

[View Documentation →](./node-red-contrib-turndown/README.md)

---

## 🚧 Future Nodes

### node-red-contrib-rag-chain

Complete RAG pipeline combining retriever and generator in a single node.

**Planned features:**
- Configurable retriever (k parameter)
- Built-in prompt templates
- Stream responses
- Source citation

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📜 License

MIT License - See individual node packages for details.

---

## 📞 Support

- Open an issue for bugs or feature requests
- Check individual node READMEs for specific documentation

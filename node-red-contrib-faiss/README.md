# node-red-contrib-faiss

FAISS vector store for Node-RED - local similarity search without requiring a server. Uses [FAISS](https://github.com/facebookresearch/faiss) via the `faiss-node` package.

## Installation

```bash
cd ~/.node-red
npm install /path/to/node-red-contrib-faiss
```

### Windows

```bash
cd C:/Users/4artu/.node-red
npm install C:/Users/4artu/IdeaProjects/node-red-nodes/node-red-contrib-faiss
```

## Usage

The FAISS Store node provides local vector storage for embeddings with similarity search capabilities.

### Operations

| Operation | Description | Input | Output |
|-----------|-------------|-------|--------|
| **Add documents** | Add documents with embeddings to index | `msg.embeddings`, `msg.documents` or `msg.payload` | Status message |
| **Similarity search** | Search for similar documents | `msg.payload` (query embedding) | Array of results with scores |
| **Save index** | Manually save index to disk | - | Status message |

### Configuration

| Property | Description | Default |
|----------|-------------|---------|
| **Name** | Optional node name | - |
| **Operation** | `add`, `search`, or `save` | `add` |
| **Persist Path** | Directory to save/load index | `./faiss_index` |
| **K** | Number of search results | `5` |

## Input/Output

### Add Operation

**Input:**
- `msg.embeddings` - Embeddings instance (from Ollama Embeddings node)
- `msg.documents` - Array of `{ pageContent, metadata }` objects (optional)
- `msg.payload` - Text content (if documents not provided)

**Output:**
- `msg.payload` - Status message

### Search Operation

**Input:**
- `msg.payload` - Query embedding vector (array of numbers)

**Output:**
- `msg.payload` - Array of results: `[{ pageContent, metadata, score }, ...]`
- `msg.searchResults` - Same as payload

## Examples

### RAG Document Indexing

```
[Text Splitter] → [Split] → [Ollama Embeddings] → [FAISS Store (add)]
                         │
                         └──────────────────────┘
                    (msg.embeddings passed through)
```

### RAG Retrieval

```
[Query] → [Ollama Embeddings] → [FAISS Store (search)] → [Function] → [ChatOllama]
                                      │
                                      └─> msg.payload = results with context
```

### Complete RAG Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  HTTP Request   │────▶│     Cheerio      │────▶│  Text Splitter  │
│  (Get webpage)  │     │   (Parse HTML)   │     │   (Chunk text)  │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
┌─────────────────┐     ┌──────────────────┐     ┌────────▼────────┐
│   ChatOllama    │◀────│  FAISS Store     │◀────│  Ollama         │
│  (Generate)     │     │   (Search k=5)   │     │  Embeddings     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Features

- **No server required** - Runs locally with file persistence
- **Automatic save/load** - Index persisted to disk automatically
- **Similarity scoring** - Results include similarity scores
- **Configurable K** - Control number of search results

## Tips

- **Index persistence**: The FAISS index is automatically saved after adding documents
- **Embedding consistency**: Use the same embedding model for indexing and searching
- **Memory usage**: Large indexes are loaded into memory - consider batch processing for very large datasets

## License

MIT

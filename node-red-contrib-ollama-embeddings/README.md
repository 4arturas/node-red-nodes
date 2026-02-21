# node-red-contrib-ollama-embeddings

Generate vector embeddings from text using Ollama embedding models in Node-RED.

## Installation

```bash
cd ~/.node-red
npm install /path/to/node-red-contrib-ollama-embeddings
```

### Windows

```bash
cd C:/Users/4artu/.node-red
npm install C:/Users/4artu/IdeaProjects/node-red-nodes/node-red-contrib-ollama-embeddings
```

## Usage

The Ollama Embeddings node generates vector embeddings from text in `msg.payload`.

### Configuration

| Property | Description | Default |
|----------|-------------|---------|
| **Name** | Optional node name | - |
| **Base URL** | Ollama server URL | `http://localhost:11434` |
| **Model** | Embedding model name | `mxbai-embed-large` |

### Supported Models

| Model | Dimensions | Description |
|-------|------------|-------------|
| `mxbai-embed-large` | 1024 | High quality, general purpose |
| `nomic-embed-text` | 768 | Good balance of speed/quality |
| `all-minilm` | 384 | Fast, lightweight |
| `snowflake-arctic-embed` | 1024 | RAG optimized |

## Input

| Property | Type | Description |
|----------|------|-------------|
| `msg.payload` | string | Text to generate embeddings for |

## Output

| Property | Type | Description |
|----------|------|-------------|
| `msg.payload` | number[] | Vector embedding array |
| `msg.embeddingDimension` | number | Dimension of the embedding |

## Examples

### RAG Document Indexing

Generate embeddings for document chunks:

```
[Text Chunk] → [Ollama Embeddings] → [FAISS Store]
```

### Similarity Search

Generate embeddings for a query and search:

```
[Query] → [Ollama Embeddings] → [FAISS Store (search)] → [Results]
```

## Prerequisites

1. **Install Ollama**: Download from [https://ollama.ai](https://ollama.ai)

2. **Pull embedding model**:
   ```bash
   ollama pull mxbai-embed-large
   ```

3. **Start Ollama** (if not running):
   ```bash
   ollama serve
   ```

## Tips

- **Batch processing**: For multiple texts, use a split node to process each text individually
- **Dimension matching**: Ensure your embedding model dimensions match your vector store configuration
- **Model selection**: Use `mxbai-embed-large` for best quality, `all-minilm` for speed

## License

MIT

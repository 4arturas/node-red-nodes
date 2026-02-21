# node-red-contrib-text-splitter

A Node-RED node to split text into smaller chunks using recursive character splitting. Ideal for preparing documents for RAG (Retrieval-Augmented Generation) indexing.

## Installation

```bash
cd ~/.node-red
npm install /path/to/node-red-contrib-text-splitter
```

### Windows

```bash
cd C:/Users/4artu/.node-red
npm install C:/Users/4artu/IdeaProjects/node-red-nodes/node-red-contrib-text-splitter
```

## Usage

The Text Splitter node splits text from `msg.payload` into smaller chunks based on configurable parameters.

### Configuration

| Property | Description | Default |
|----------|-------------|---------|
| **Name** | Optional node name | - |
| **Chunk Size** | Maximum characters per chunk | `1000` |
| **Chunk Overlap** | Characters overlapping between chunks | `100` |
| **Separators** | Separator characters (pipe-delimited) | `\n\n|\n| |` |
| **Output** | `Array of chunks` or `First chunk only` | `Array` |

### How It Works

The recursive character splitter tries separators in order:
1. First tries splitting by paragraph (`\n\n`)
2. If chunks are still too large, tries newlines (`\n`)
3. Then spaces (` `)
4. Finally individual characters

This ensures semantic units (paragraphs, sentences) are preserved when possible.

## Input

| Property | Type | Description |
|----------|------|-------------|
| `msg.payload` | string | Text content to split |

## Output

| Property | Type | Description |
|----------|------|-------------|
| `msg.payload` | array\|string | Array of chunks or single chunk |
| `msg.chunkCount` | number | Number of chunks created |
| `msg.chunks` | array | All chunks (when output is "single") |

## Examples

### RAG Document Indexing

Split a document into chunks for embedding generation:

```
Chunk Size: 1000
Chunk Overlap: 100
Separators: \n\n|\n| |
Output: Array of chunks
```

Then use a split node to process each chunk:

```
[Text Splitter] → [Split] → [Ollama Embeddings] → [FAISS Store]
```

### Large Text Processing

Process large texts that exceed LLM context limits:

```
Chunk Size: 4000
Chunk Overlap: 200
Separators: \n\n|\n| |
Output: Array of chunks
```

## Tips

- **Chunk Size**: Match your embedding model's max token length (e.g., 512 tokens ≈ 1000 chars)
- **Chunk Overlap**: 10-20% of chunk size helps maintain context across chunks
- **Separators**: Customize for your content type (e.g., add `.` for sentence splitting)

## License

MIT

# node-red-contrib-chat-ollama

Chat with Ollama models in Node-RED using LangChain's ChatOllama.

## Installation

```bash
cd ~/.node-red
npm install /path/to/node-red-contrib-chat-ollama
```

### Windows

```bash
cd C:/Users/4artu/.node-red
npm install C:/Users/4artu/IdeaProjects/node-red-nodes/node-red-contrib-chat-ollama
```

## Usage

Sends messages to Ollama and returns AI responses.

### Configuration

| Property | Description | Default |
|----------|-------------|---------|
| **Base URL** | Ollama server URL | `http://localhost:11434` |
| **Model Name** | Ollama model (e.g., `qwen2.5:7b`, `llama3.1`) | `llama3.1` |
| **Temperature** | Response creativity (0-1) | `0.7` |

## Input

| Property | Type | Description |
|----------|------|-------------|
| `msg.payload` | string\|array | Message text or conversation array |

### Conversation Format

```json
[
  ["system", "You are a helpful assistant."],
  ["user", "Hello!"],
  ["assistant", "Hi! How can I help?"]
]
```

## Output

| Property | Type | Description |
|----------|------|-------------|
| `msg.payload` | string | AI response content |
| `msg.rawResponse` | object | Full response object |

## Example

```
[Inject: "What is the weather in SF?"] → [ChatOllama] → [Debug]
```

## Prerequisites

1. Install Ollama from [https://ollama.ai](https://ollama.ai)
2. Pull a model: `ollama pull qwen2.5:7b`
3. Start Ollama: `ollama serve`

## License

MIT

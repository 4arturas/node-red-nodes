# node-red-nodes

A collection of custom Node-RED nodes for various purposes.

## Available Nodes

### ChatOllama Node
- Name: `node-red-contrib-chat-ollama`
- Description: LangChain ChatOllama node for Node-RED
- Allows integration with Ollama AI models in Node-RED flows
- Configurable parameters: base URL, model name, temperature

### MCP (Model Context Protocol) Node
- Name: `node-red-contrib-mcp`
- Description: Model Context Protocol (MCP) node for Node-RED
- Enables Node-RED flows to interact with MCP-compatible services
- Supports file system operations via MCP protocol
- Configurable parameters: allowed directories, command, server arguments

## Installation

For each node, navigate to your Node-RED user directory and install:

### Linux
```bash
cd ~/.node-red
npm install /path/to/node-red-contrib-chat-ollama
npm install /path/to/node-red-contrib-mcp
```

### Windows
```bash
cd C:\Users\4artu\.node-red
npm install C:\Users\4artu\IdeaProjects\node-red-nodes\node-red-contrib-mcp
```
# node-red-contrib-mcp

Model Context Protocol (MCP) client nodes for Node-RED. Enables integration with MCP-compatible servers for tool calling and function execution.

## Installation

```bash
cd ~/.node-red
npm install /path/to/node-red-contrib-mcp
```

### Windows

```bash
cd C:/Users/4artu/.node-red
npm install C:/Users/4artu/IdeaProjects/node-red-nodes/node-red-contrib-mcp
```

## Nodes

### mcp-call-tool

Call a specific tool from an MCP server.

**Configuration:**
- **Server** (optional): Persistent MCP server configuration node
- **Command**: Server command (e.g., `npx`, `node`)
- **Server Args**: Server arguments

**Input:**
- `msg.payload.name` - Tool name to call
- `msg.payload.arguments` - Tool arguments

**Output:**
- `msg.payload` - Tool result

---

### mcp-list-tools

List available tools from an MCP server.

**Input:** Optional command/args override via `msg.command` and `msg.serverArgs`

**Output:**
- `msg.payload` - Array of available tool definitions

---

### mcp-server-config

Persistent MCP server configuration for reuse across multiple nodes.

**Configuration:**
- **Command**: Server command
- **Server Args**: Server arguments

## Example: Filesystem MCP

```
[Inject] → [MCP List Tools] → [Debug: Available tools]

[Inject: {name: "read_file", arguments: {path: "/tmp/test.txt"}}] 
  → [MCP Call Tool] → [Debug: File content]
```

## Example: Playwright MCP

```
[mcp-server-config]
  Command: npx
  Args: @playwright/mcp

[mcp-call-tool] → Browse websites, take screenshots, etc.
```

## Supported MCP Servers

| Server | Command | Description |
|--------|---------|-------------|
| Filesystem | `npx @modelcontextprotocol/server-filesystem /path` | File operations |
| Playwright | `npx @playwright/mcp` | Browser automation |
| Custom | Any stdio MCP server | Bring your own |

## License

MIT

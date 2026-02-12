# node-red-contrib-mcp

Model Context Protocol (MCP) node for Node-RED. This node allows Node-RED flows to act as MCP clients, enabling seamless integration with any MCP-compatible server (like filesystem, database, or API bridges). It is designed to be easily used by LLMs for tool discovery and execution.

## Installation

### Linux
```bash
cd ~/.node-red
npm install /path/to/node-red-contrib-mcp
```

### Windows
```bash
cd C:\Users\<user>\.node-red
npm install C:\path\to\node-red-contrib-mcp
```

## Configuration

The MCP node can be configured with the following parameters:

- **Name**: A custom name for the node.
- **Mode**: 
    - `Call Tool`: Executes a specific tool provided by the server.
    - `List Tools`: Returns an array of all available tools on the server.
- **Allowed Dirs**: Comma-separated list of directories to allow access to (specific to the filesystem server).
- **Command**: Command to execute the MCP server (default: `npx`).
- **Server Args**: Arguments to pass to the MCP server (default: `@modelcontextprotocol/server-filesystem`).

## Usage

### Modes

#### 1. List Tools Mode
In this mode, the node ignores the input payload and returns a list of all tools available on the MCP server. This is useful for passing tool definitions to an LLM.

**Output (`msg.payload`):**
An array of tool objects, each containing `name`, `description`, and `inputSchema`.

#### 2. Call Tool Mode
In this mode, the node executes a specific tool based on the input `msg.payload`.

### Input Formats (Call Tool Mode)

The node is flexible and supports multiple payload formats:

**Standard MCP/LLM Format:**
```json
{
  "name": "list_directory",
  "arguments": {
    "path": "."
  }
}
```

**OpenAI/LangChain Format:**
```json
{
  "call": {
    "name": "list_directory",
    "arguments": {
      "path": "."
    }
  }
}
```

**Output:**
- **msg.payload**: The main text result from the tool (or the full result object if no text is present).
- **msg.mcpResult**: The complete, raw response from the MCP server.
- **msg.mcpTool**: The name of the tool that was called.

---

## Example Flow

Copy the JSON below and import it into Node-RED (**Menu > Import**).

```json
[{"id":"f6f2187d.0963d8","type":"tab","label":"MCP Example","disabled":false,"info":""},{"id":"1","type":"inject","z":"f6f2187d.0963d8","name":"List Tools Trigger","props":[{"p":"payload"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"{}","payloadType":"json","x":150,"y":80,"wires":[["2"]]},{"id":"2","type":"mcp-node","z":"f6f2187d.0963d8","name":"MCP Server (List)","mode":"list","allowedDirs":"C:\\Users\\4artu\\soft\\antigravity-remove","command":"npx","serverArgs":"@modelcontextprotocol/server-filesystem","x":350,"y":80,"wires":[["3"]]},{"id":"3","type":"debug","z":"f6f2187d.0963d8","name":"Available Tools","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"payload","targetType":"msg","statusVal":"","statusType":"auto","x":560,"y":80,"wires":[]},{"id":"4","type":"inject","z":"f6f2187d.0963d8","name":"Call Tool Trigger","props":[{"p":"payload"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"{\"name\":\"list_directory\",\"arguments\":{\"path\":\".\"}}","payloadType":"json","x":150,"y":140,"wires":[["5"]]},{"id":"5","type":"mcp-node","z":"f6f2187d.0963d8","name":"MCP Server (Call)","mode":"call","allowedDirs":"C:\\Users\\4artu\\soft\\antigravity-remove","command":"npx","serverArgs":"@modelcontextprotocol/server-filesystem","x":350,"y":140,"wires":[["6"]]},{"id":"6","type":"debug","z":"f6f2187d.0963d8","name":"Tool Result","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"payload","targetType":"msg","statusVal":"","statusType":"auto","x":550,"y":140,"wires":[]}]
```
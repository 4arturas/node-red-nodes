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
cd C:/Users/4artu/.node-red
npm install C:\path\to\node-red-contrib-mcp
```

```sh
node C:/Users/4artu/IdeaProjects/node-red-nodes/node-red-contrib-mcp/node_modules/@playwright/mcp/cli.js
````

```sh
node C:/Users/4artu/IdeaProjects/node-red-nodes/node-red-contrib-mcp/node_modules/@modelcontextprotocol/server-filesystem/dist/index.js C:/tmp
````

Dockling
--- TOOLS FOUND ---
Name: is_document_in_local_cache
Name: convert_document_into_docling_document
Args: {
"properties": {
"source": {
"description": "The URL or local file path to the document.",
"title": "Source",
"type": "string"
}
},
"required": [
"source"
],
"title": "convert_document_into_docling_documentArguments",
"type": "object"
}
Name: convert_directory_files_into_docling_document
Name: create_new_docling_document
Name: export_docling_document_to_markdown
Name: save_docling_document
Name: page_thumbnail
Name: add_title_to_docling_document
Name: add_section_heading_to_docling_document
Name: add_paragraph_to_docling_document
Name: open_list_in_docling_document
Name: close_list_in_docling_document
Name: add_list_items_to_list_in_docling_document
Name: add_table_in_html_format_to_docling_document
Name: get_overview_of_document_anchors
Name: search_for_text_in_document_anchors
Name: get_text_of_document_item_at_anchor
Name: update_text_of_document_item_at_anchor
Name: delete_document_items_at_anchors
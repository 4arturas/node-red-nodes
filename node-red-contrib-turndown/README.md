# node-red-contrib-turndown

Convert HTML to Markdown format in Node-RED using [Turndown](https://github.com/mixmark-io/turndown).

## Installation

```bash
cd ~/.node-red
npm install /path/to/node-red-contrib-turndown
```

### Windows

```bash
cd C:/Users/4artu/.node-red
npm install C:/Users/4artu/IdeaProjects/node-red-nodes/node-red-contrib-turndown
```

## Usage

Converts HTML content from `msg.payload` to Markdown format.

## Input

| Property | Type | Description |
|----------|------|-------------|
| `msg.payload` | string | HTML content to convert |

## Output

| Property | Type | Description |
|----------|------|-------------|
| `msg.payload` | string | Markdown content |

## Example

```
[HTTP Request: Get webpage] → [Turndown] → [Debug: Markdown]
```

### Input/Output Example

**Input:**
```html
<h1>Hello</h1><p>This is <strong>bold</strong> text.</p>
```

**Output:**
```markdown
# Hello

This is **bold** text.
```

## License

MIT

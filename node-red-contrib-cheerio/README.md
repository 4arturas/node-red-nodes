# node-red-contrib-cheerio

Parse HTML and extract data using [Cheerio](https://cheerio.js.org/) - a fast, flexible implementation of core jQuery for the server.

## Installation

```bash
cd ~/.node-red
npm install /path/to/node-red-contrib-cheerio
```

### Windows

```bash
cd C:/Users/4artu/.node-red
npm install C:/Users/4artu/IdeaProjects/node-red-nodes/node-red-contrib-cheerio
```

## Usage

Parses HTML from `msg.payload` and extracts data based on CSS selectors.

### Configuration

| Property | Description | Default |
|----------|-------------|---------|
| **Name** | Optional node name | - |
| **Selector** | CSS selector (e.g., `.class`, `#id`, `tag`) | - |
| **Attribute** | What to extract: `text()`, `html()`, `attr()`, `val()` | `text()` |
| **Attr Name** | Attribute name when using `attr()` | `href` |
| **Output** | `Single string` or `Array of values` | `Single string` |

## Input

| Property | Type | Description |
|----------|------|-------------|
| `msg.payload` | string | HTML content to parse |

## Output

| Property | Type | Description |
|----------|------|-------------|
| `msg.payload` | string\|array | Extracted data |

## Examples

### Extract All Links

```
Selector: a
Attribute: attr()
Attr Name: href
Output: Array of values
```

Output: `["/page1", "/page2", "https://example.com"]`

### Get Heading Text

```
Selector: h1
Attribute: text()
Output: Single string
```

Output: `"Welcome to My Website"`

### Get Image Sources

```
Selector: img
Attribute: attr()
Attr Name: src
Output: Array of values
```

Output: `["/images/logo.png", "/images/banner.jpg"]`

## Common Selectors

| Selector | Description |
|----------|-------------|
| `*` | Select all elements |
| `p` | Select all `<p>` elements |
| `.classname` | Select elements with class |
| `#id` | Select element by ID |
| `a[href]` | Select `<a>` elements with href |
| `ul li` | Select all `<li>` inside `<ul>` |

## License

MIT

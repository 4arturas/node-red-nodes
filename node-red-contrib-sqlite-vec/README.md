# node-red-contrib-sqlite-vec

A Node-RED node for local vector search using SQLite and the `sqlite-vec` extension.

## Features

- **Local Vector Search**: No need for external vector databases.
- **Embedded**: Uses `better-sqlite3` for high performance.
- **Easy to Use**: Integrates directly with Node-RED as a standard storage node.

## Installation

```bash
npm install node-red-contrib-sqlite-vec
```

## Usage

### KNN Search

To find the 5 most similar items to a query vector:

**SQL**:
```sql
SELECT
  rowid,
  distance
FROM vec_items
WHERE vec_knn(embedding, ?, 5);
```

**msg.payload**:
```json
[0.1, 0.2, 0.3]
```

## Operations

- **Query**: Use for retrieving data (SELECT).
- **Execute**: Use for modifying data or schema (INSERT, UPDATE, CREATE).

## Requirements

- Node.js 18 or later.
- A platform supported by `sqlite-vec` (Windows, Linux, macOS).

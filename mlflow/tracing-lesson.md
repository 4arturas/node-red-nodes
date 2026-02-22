# MLflow Tracing in JavaScript

## What is MLflow Tracing?

**Tracing** records the **execution flow** of your AI application - it shows:
- Which functions were called
- What inputs/outputs each function had
- How long each step took
- How functions call other functions (nested calls)

## Example Trace Tree

```
article-workflow (CHAIN) - 12.5s
├── generate-outline (LLM) - 3.2s
│   ├── Input: { topic: "AI Future" }
│   └── Output: "I. Introduction..." (1500 chars)
├── generate-content (LLM) - 8.1s
│   ├── Input: { topic: "AI Future", outline: "..." }
│   └── Output: "The Future of AI..." (3500 chars)
└── summarize (LLM) - 1.2s
    ├── Input: { content: "..." }
    └── Output: "AI is transforming..." (500 chars)
```

## Installation

```bash
npm install mlflow-tracing
```

## Basic Usage

### 1. Initialize MLflow

```javascript
import * as mlflow from "mlflow-tracing";

mlflow.init({
  trackingUri: "http://localhost:5000",
  experimentId: "3",  // Your experiment ID
});
```

### 2. Trace a Function with `mlflow.trace()`

```javascript
const myFunction = mlflow.trace(
  async (input) => {
    return await someOperation(input);
  },
  { name: "my-function", spanType: mlflow.SpanType.LLM }
);
```

### 3. Trace with `mlflow.withSpan()` (Recommended)

```javascript
const result = await mlflow.withSpan(
  async () => {
    // Your code here
    return await llm.invoke(prompt);
  },
  {
    name: "generate-content",
    spanType: mlflow.SpanType.LLM,
    inputs: { prompt },
  }
);
```

## Complete Example

See `tracing-example.js` in this project:

```bash
npm run tracing
```

## Span Types

| Type | Description |
|------|-------------|
| `SpanType.LLM` | LLM model calls |
| `SpanType.CHAIN` | Sequence of operations |
| `SpanType.TOOL` | External tool calls |
| `SpanType.RETRIEVER` | Document retrieval |
| `SpanType.EMBEDDING` | Embedding generation |
| `SpanType.AGENT` | Agent execution |

## Important Note: Databricks vs Open-Source MLflow

⚠️ **MLflow Tracing works differently depending on your MLflow server:**

### Databricks MLflow (Full Support)
- ✅ Traces tab in UI
- ✅ Trace search and filtering
- ✅ Trace visualization with tree view
- ✅ Automatic trace logging
- Requires: Databricks workspace + API token

### Open-Source MLflow (Limited Support)
- ❌ No Traces tab in UI (shows "No traces recorded")
- ❌ Trace search API not available
- ⚠️ `mlflow-tracing` package is designed for Databricks
- Works with: Databricks-hosted MLflow tracking

## Alternatives for Open-Source MLflow

### Option 1: Manual Logging (Current Approach)

Log inputs/outputs as params and metrics:

```javascript
await logParam(runId, "outline_input", topic);
await logParam(runId, "outline_output", outline);
await logMetric(runId, "outline_time", duration);
```

### Option 2: Log as Artifacts

Save trace data as JSON files:

```javascript
const traceData = {
  name: "generate-outline",
  inputs: { topic },
  outputs: { outline },
  duration: 3200,
};

await fs.writeFile("trace.json", JSON.stringify(traceData));
// Log as artifact to MLflow
```

### Option 3: Use Alternative Tools

- **LangSmith** (by LangChain) - Full tracing for LangChain apps
- **Arize Phoenix** - Open-source tracing
- **Braintrust** - Evaluation and tracing platform

## LangSmith Alternative (Recommended for LangChain)

```bash
npm install langsmith
```

```javascript
import { traceable } from "langsmith/traceable";

const generateOutline = traceable(async (topic) => {
  const prompt = `Create outline for: ${topic}`;
  const response = await llm.invoke([new HumanMessage(prompt)]);
  return response.content;
}, { name: "generate-outline" });
```

View traces at: https://smith.langchain.com

## Summary

| Feature | Databricks MLflow | Open-Source MLflow | LangSmith |
|---------|------------------|-------------------|-----------|
| Tracing UI | ✅ | ❌ | ✅ |
| Trace Search | ✅ | ❌ | ✅ |
| Cost | Paid | Free | Freemium |
| LangChain Integration | ⚠️ Partial | ⚠️ Partial | ✅ Full |
| Setup Complexity | Medium | Low | Low |

## For This Project

Since you're using **open-source MLflow with Docker**, the `tracing-example.js` demonstrates the API but traces won't appear in the UI. 

**Recommended approaches:**
1. Use **LangSmith** for LangChain tracing (best integration)
2. Use **manual logging** (params/metrics) with open-source MLflow
3. Use **Databricks MLflow** if you need enterprise tracing

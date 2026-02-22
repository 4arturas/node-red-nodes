# MLflow Traces API

## Can You Log Traces via REST API?

**Yes, but it's complicated.**

## The Traces Endpoint

MLflow 3.5+ introduced a traces endpoint:

```
POST /v1/traces
Content-Type: application/json
```

### Request Format (OpenTelemetry Protocol - OTLP)

```json
{
  "resource_spans": [
    {
      "resource": {
        "attributes": [
          { "key": "service.name", "value": { "string_value": "my-app" } }
        ]
      },
      "scope_spans": [
        {
          "scope": { "name": "mlflow.tracing" },
          "spans": [
            {
              "trace_id": "base64-encoded-trace-id",
              "span_id": "base64-encoded-span-id",
              "name": "generate-outline",
              "kind": "SPAN_KIND_INTERNAL",
              "start_time_unix_nano": 1708596000000000000,
              "end_time_unix_nano": 1708596003000000000,
              "attributes": [
                { "key": "mlflow.spanType", "value": { "string_value": "LLM" } },
                { "key": "mlflow.inputs", "value": { "string_value": "{\"topic\": \"AI\"}" } },
                { "key": "mlflow.outputs", "value": { "string_value": "I. Introduction..." } }
              ],
              "status": { "code": "STATUS_CODE_OK" }
            }
          ]
        }
      ]
    }
  ]
}
```

## The Challenges

### 1. MLflow Version Requirement

The `/v1/traces` endpoint is only available in **MLflow 3.5+**.

Check your version:
```bash
docker exec <container> mlflow --version
```

If older, update your Docker command:
```bash
docker run --rm -p 5000:5000 ghcr.io/mlflow/mlflow:latest mlflow server
```

### 2. Complex Format

The OTLP format requires:
- Base64-encoded trace/span IDs (16 bytes for trace_id, 8 bytes for span_id)
- Unix nanosecond timestamps
- Protobuf-like nested structure

### 3. OpenTelemetry Dependency

The format follows the [OpenTelemetry specification](https://opentelemetry.io/docs/specs/otel/).

## Simpler Alternative: Log as Artifacts

Instead of using the traces API, log trace data as JSON artifacts:

```javascript
import { entrypoint, task } from "@langchain/langgraph";
import { ChatOllama } from "@langchain/ollama";
import { HumanMessage } from "@langchain/core/messages";
import dayjs from "dayjs";

const llm = new ChatOllama({
  model: "qwen2.5:7b",
  baseUrl: "http://localhost:11434",
});

// Helper to create trace JSON
function createTrace(name, inputs, outputs, duration, parentSpanId = null) {
  return {
    name,
    span_type: "LLM",
    inputs,
    outputs,
    duration_ms: duration,
    parent_span_id: parentSpanId,
    start_time: Date.now(),
  };
}

// Helper to log trace as artifact
async function logTraceArtifact(runId, traceData, traceName = "trace") {
  const fs = await import("fs");
  const path = `./mlruns/traces/${runId}_${traceName}_${Date.now()}.json`;
  
  // Create directory if not exists
  const dir = path.substring(0, path.lastIndexOf('/'));
  fs.mkdirSync(dir, { recursive: true });
  
  fs.writeFileSync(path, JSON.stringify(traceData, null, 2));
  console.log(`Trace saved to: ${path}`);
  
  // Note: To upload to MLflow, you'd need to use the artifacts API
  // POST /api/2.0/mlflow/artifacts/upload
}

// Manual tracing with artifact logging
async function generateOutline(topic) {
  const startTime = Date.now();
  const prompt = `Create a brief outline for an article about: ${topic}`;
  const response = await llm.invoke([new HumanMessage(prompt)]);
  const duration = Date.now() - startTime;
  
  const trace = createTrace(
    "generate-outline",
    { prompt, topic },
    { content: response.content },
    duration
  );
  
  return { content: response.content, trace };
}

async function main() {
  const topic = "The Future of AI";
  
  // Your existing run creation code...
  const runId = "your-run-id";
  
  const result = await generateOutline(topic);
  
  // Log trace as artifact
  await logTraceArtifact(runId, result.trace, "generate-outline");
}

main();
```

## Alternative: Use LangSmith (Recommended)

For LangChain tracing, **LangSmith** is the best option:

```bash
npm install langsmith
```

```javascript
import { Client } from "langsmith";

const client = new Client({
  apiKey: "your-api-key",
});

// Create a run
const runId = crypto.randomUUID();
await client.createRun({
  name: "generate-outline",
  run_type: "llm",
  inputs: { topic },
  outputs: { outline },
  id: runId,
});

// View at: https://smith.langchain.com
```

## Summary

| Method | Complexity | MLflow Version | UI Support |
|--------|-----------|----------------|------------|
| `/v1/traces` OTLP API | High | 3.5+ | ✅ Yes |
| Artifacts (JSON files) | Low | Any | ⚠️ Manual viewing |
| LangSmith | Low | N/A | ✅ Yes (separate UI) |

**For open-source MLflow < 3.5:** Use artifacts or LangSmith.

**For MLflow 3.5+:** Use the `/v1/traces` endpoint with OTLP format.

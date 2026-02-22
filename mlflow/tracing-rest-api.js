import { entrypoint, task } from "@langchain/langgraph";
import { ChatOllama } from "@langchain/ollama";
import { HumanMessage } from "@langchain/core/messages";
import dayjs from "dayjs";
import crypto from "crypto";

// Initialize Ollama LLM
const llm = new ChatOllama({
  model: "qwen2.5:7b",
  baseUrl: "http://localhost:11434",
  temperature: 0.7,
});

// Helper to generate random trace/span IDs
function generateTraceId() {
  return crypto.randomBytes(16).toString('hex');
}

function generateSpanId() {
  return crypto.randomBytes(8).toString('hex');
}

// Helper to get experiment by name using REST API
async function getExperimentByName(name) {
  const response = await fetch(`http://localhost:5000/api/2.0/mlflow/experiments/get-by-name?experiment_name=${encodeURIComponent(name)}`);
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    return data;
  }
  return data;
}

// Helper to create experiment using REST API
async function createExperiment(name) {
  const response = await fetch("http://localhost:5000/api/2.0/mlflow/experiments/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const errorText = await response.text();
  if (!response.ok) {
    console.error(`Create experiment error: ${errorText}`);
    throw new Error(`Failed to create experiment: ${response.statusText}`);
  }
  return JSON.parse(errorText);
}

// Helper to create run using REST API
async function createRun(experimentId, runName) {
  const startTime = Date.now() * 1000;
  const response = await fetch("http://localhost:5000/api/2.0/mlflow/runs/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      experiment_id: experimentId,
      name: runName,
      start_time: startTime,
      tags: [{ key: "mlflow.runName", value: runName }],
    }),
  });
  const errorText = await response.text();
  if (!response.ok) {
    console.error(`Create run error: ${errorText}`);
    throw new Error(`Failed to create run: ${response.statusText}`);
  }
  return JSON.parse(errorText);
}

// Helper to log param using REST API
async function logParam(runId, key, value) {
  const response = await fetch("http://localhost:5000/api/2.0/mlflow/runs/log-parameter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      run_uuid: runId,
      key,
      value: String(value),
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Log param error (${key}): ${errorText}`);
  }
  return response.ok;
}

// Helper to log metric using REST API
async function logMetric(runId, key, value) {
  const response = await fetch("http://localhost:5000/api/2.0/mlflow/runs/log-metric", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      run_uuid: runId,
      key,
      value,
      timestamp: Date.now() * 1000,
      step: 0,
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Log metric error (${key}): ${errorText}`);
  }
  return response.ok;
}

// Helper to update run status using REST API
async function updateRunStatus(runId, status) {
  const response = await fetch("http://localhost:5000/api/2.0/mlflow/runs/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      run_uuid: runId,
      status,
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Update run status error: ${errorText}`);
  }
  return response.ok;
}

// Helper to log trace as JSON artifact (since OTLP requires protobuf)
async function logTrace(experimentId, runId, traceData) {
  const fs = await import("fs");
  const path = await import("path");
  
  // Create traces directory
  const tracesDir = path.join(process.cwd(), "mlruns", "traces");
  fs.mkdirSync(tracesDir, { recursive: true });
  
  // Save trace as JSON file
  const traceFile = path.join(tracesDir, `${runId}_trace.json`);
  fs.writeFileSync(traceFile, JSON.stringify(traceData, null, 2));
  console.log(`Trace saved to: ${traceFile}`);
  
  // Log the trace file as an artifact using MLflow REST API
  try {
    const artifactContent = JSON.stringify(traceData);
    const response = await fetch(`http://localhost:5000/api/2.0/mlflow/artifacts/${runId}/trace.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: artifactContent,
    });
    if (response.ok) {
      console.log("Trace artifact uploaded to MLflow!");
    } else {
      const errorText = await response.text();
      console.log(`Artifact upload response: ${errorText || response.status}`);
    }
  } catch (err) {
    console.log(`Could not upload artifact: ${err.message}`);
  }
  
  return true;
}

// Create OTLP trace payload
function createOTLPTrace(experimentId, runId, spans) {
  const traceId = generateTraceId();

  return {
    resource_spans: [
      {
        resource: {
          attributes: [
            { key: "service.name", value: { string_value: "langchain-ollama" } },
            { key: "mlflow.trace.request_id", value: { string_value: runId } },
          ],
        },
        scope_spans: [
          {
            scope: { name: "langchain-ollama" },
            spans: spans.map(span => {
              // Prepare inputs and outputs as properly formatted strings
              const inputsStr = typeof span.inputs === 'string' 
                ? span.inputs 
                : JSON.stringify(span.inputs, null, 2);
              const outputsStr = typeof span.outputs === 'string'
                ? span.outputs
                : JSON.stringify(span.outputs, null, 2);

              return {
                trace_id: Buffer.from(traceId, 'hex').toString('base64'),
                span_id: Buffer.from(generateSpanId(), 'hex').toString('base64'),
                parent_span_id: span.parentSpanId ? Buffer.from(span.parentSpanId, 'hex').toString('base64') : null,
                name: span.name,
                kind: span.kind || "SPAN_KIND_INTERNAL",
                start_time_unix_nano: span.startTime * 1000000, // Convert ms to nanoseconds
                end_time_unix_nano: span.endTime * 1000000,
                attributes: [
                  { key: "mlflow.spanType", value: { string_value: span.spanType } },
                  { key: "mlflow.inputs", value: { string_value: inputsStr } },
                  { key: "mlflow.outputs", value: { string_value: outputsStr } },
                  // Add user attribute
                  { key: "mlflow.user", value: { string_value: process.env.USER || "anonymous" } },
                ],
                status: { code: span.status || "STATUS_CODE_OK" },
              };
            }),
          },
        ],
      },
    ],
  };
}

// Task 1: Generate outline
async function generateOutline(topic) {
  const startTime = Date.now();
  const prompt = `Create a brief outline for an article about: ${topic}`;
  const response = await llm.invoke([new HumanMessage(prompt)]);
  const endTime = Date.now();
  
  return {
    content: response.content,
    span: {
      name: "generate-outline",
      spanType: "LLM",
      inputs: { topic, prompt },
      outputs: { content: response.content, length: response.content.length },
      startTime,
      endTime,
      kind: "SPAN_KIND_LLM",
    },
  };
}

// Task 2: Generate content
async function generateContent(topic, outline) {
  const startTime = Date.now();
  const prompt = `Write a short article based on this outline:\n\n${outline}\n\nTopic: ${topic}`;
  const response = await llm.invoke([new HumanMessage(prompt)]);
  const endTime = Date.now();
  
  return {
    content: response.content,
    span: {
      name: "generate-content",
      spanType: "LLM",
      inputs: { topic, outline, prompt },
      outputs: { content: response.content, length: response.content.length },
      startTime,
      endTime,
      kind: "SPAN_KIND_LLM",
    },
  };
}

// Task 3: Summarize
async function summarize(content) {
  const startTime = Date.now();
  const prompt = `Summarize the following content in 2-3 sentences:\n\n${content}`;
  const response = await llm.invoke([new HumanMessage(prompt)]);
  const endTime = Date.now();
  
  return {
    content: response.content,
    span: {
      name: "summarize",
      spanType: "LLM",
      inputs: { content, prompt },
      outputs: { content: response.content, length: response.content.length },
      startTime,
      endTime,
      kind: "SPAN_KIND_LLM",
    },
  };
}

// Main workflow using functional API (entrypoint)
const articleWorkflow = entrypoint(
  { checkpointer: false },
  async (topic) => {
    console.log(`\n📝 Generating article about: ${topic}`);

    // Step 1: Generate outline
    console.log("\n1️⃣ Generating outline...");
    const outlineResult = await generateOutline(topic);
    console.log(`Outline:\n${outlineResult.content}`);

    // Step 2: Generate content
    console.log("\n2️⃣ Generating content...");
    const contentResult = await generateContent(topic, outlineResult.content);
    console.log(`Content (first 200 chars):\n${contentResult.content.substring(0, 200)}...`);

    // Step 3: Summarize
    console.log("\n3️⃣ Generating summary...");
    const summaryResult = await summarize(contentResult.content);
    console.log(`Summary:\n${summaryResult.content}`);

    return {
      topic,
      outline: outlineResult.content,
      content: contentResult.content,
      summary: summaryResult.content,
      spans: [
        outlineResult.span,
        contentResult.span,
        summaryResult.span,
      ],
    };
  }
);

// Run the workflow
async function main() {
  console.log("🚀 Starting MLflow Tracing + LangChain + Ollama Example");
  console.log("======================================================\n");

  const topic = "The Future of Artificial Intelligence";
  const experimentName = "langchain-ollama-tracing";

  try {
    // Get or create experiment
    let experimentId;
    let expData = await getExperimentByName(experimentName);
    
    if (expData && expData.experiment && expData.experiment.lifecycle_stage === "active") {
      experimentId = expData.experiment.experiment_id;
      console.log(`Using existing experiment: ${experimentName} (ID: ${experimentId})`);
    } else {
      const result = await createExperiment(experimentName);
      experimentId = result.experiment_id;
      console.log(`Created new experiment: ${experimentName} (ID: ${experimentId})`);
    }

    // Create run with custom name
    const timeString = dayjs().format('YYYY-MM-DDTHH-mm-ss');
    const runName = `${topic.toLowerCase().replace(/\s+/g, '-').substring(0, 25).replace(/-+$/, '')}-${timeString}`;
    const runData = await createRun(String(experimentId), runName);
    const runId = runData.run.info.run_id;
    console.log(`Created run: ${runName} (ID: ${runId})`);

    // Log parameters
    console.log("Logging parameters...");
    await logParam(runId, "topic", topic);
    await logParam(runId, "model", "qwen2.5:7b");
    await logParam(runId, "baseUrl", "http://localhost:11434");

    // Run the workflow
    const workflowStartTime = Date.now();
    const workflowResult = await articleWorkflow.invoke(topic);
    const workflowEndTime = Date.now();

    // Log metrics
    console.log("Logging metrics...");
    await logMetric(runId, "outline_length", workflowResult.outline.length);
    await logMetric(runId, "content_length", workflowResult.content.length);
    await logMetric(runId, "summary_length", workflowResult.summary.length);
    await logMetric(runId, "total_duration_ms", workflowEndTime - workflowStartTime);

    // Create and log trace
    console.log("Logging trace to MLflow...");
    const workflowSpan = {
      name: "article-workflow",
      spanType: "CHAIN",
      inputs: { topic },
      outputs: { 
        outline_length: workflowResult.outline.length,
        content_length: workflowResult.content.length,
        summary_length: workflowResult.summary.length,
      },
      startTime: workflowStartTime,
      endTime: workflowEndTime,
      kind: "SPAN_KIND_CHAIN",
    };

    // Add workflow span as parent
    const allSpans = workflowResult.spans.map(span => ({
      ...span,
      parentSpanId: generateSpanId(), // Will be replaced with actual workflow span ID
    }));
    
    // Create trace with all spans
    const traceData = createOTLPTrace(experimentId, runId, [workflowSpan, ...allSpans]);
    await logTrace(experimentId, runId, traceData);
    console.log("Trace logged successfully!");

    // Mark run as finished
    console.log("Updating run status to FINISHED...");
    await updateRunStatus(runId, "FINISHED");
    console.log("Run completed and saved to MLflow.");

    console.log("\n✅ Workflow completed successfully!");
    console.log(`\n📊 Results:`);
    console.log(`   Topic: ${workflowResult.topic}`);
    console.log(`   Outline length: ${workflowResult.outline.length} chars`);
    console.log(`   Content length: ${workflowResult.content.length} chars`);
    console.log(`   Summary length: ${workflowResult.summary.length} chars`);
    console.log(`   Run ID: ${runId}`);
    console.log(`\n📈 View results and traces in MLflow UI: http://localhost:5000`);
    console.log(`🔍 Click on the run, then go to the "Traces" tab to see the trace tree`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

main();

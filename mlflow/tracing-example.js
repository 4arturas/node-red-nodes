import { entrypoint, task } from "@langchain/langgraph";
import { ChatOllama } from "@langchain/ollama";
import { HumanMessage } from "@langchain/core/messages";
import dayjs from "dayjs";
import * as mlflow from "mlflow-tracing";

// Initialize Ollama LLM
const llm = new ChatOllama({
  model: "qwen2.5:7b",
  baseUrl: "http://localhost:11434",
  temperature: 0.7,
});

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

// Initialize MLflow (called after experiment is created)
function initMLflow(experimentId) {
  mlflow.init({
    trackingUri: "http://localhost:5000",
    experimentId: String(experimentId),
  });
}

// Task 1: Generate outline (traced with mlflow.withSpan)
async function generateOutline(topic) {
  return await mlflow.withSpan(
    async () => {
      const prompt = `Create a brief outline for an article about: ${topic}`;
      const response = await llm.invoke([new HumanMessage(prompt)]);
      return response.content;
    },
    {
      name: "generate-outline",
      spanType: mlflow.SpanType.LLM,
      inputs: { topic },
    }
  );
}

// Task 2: Generate content (traced with mlflow.withSpan)
async function generateContent(topic, outline) {
  return await mlflow.withSpan(
    async () => {
      const prompt = `Write a short article based on this outline:\n\n${outline}\n\nTopic: ${topic}`;
      const response = await llm.invoke([new HumanMessage(prompt)]);
      return response.content;
    },
    {
      name: "generate-content",
      spanType: mlflow.SpanType.LLM,
      inputs: { topic, outline },
    }
  );
}

// Task 3: Summarize (traced with mlflow.withSpan)
async function summarize(content) {
  return await mlflow.withSpan(
    async () => {
      const prompt = `Summarize the following content in 2-3 sentences:\n\n${content}`;
      const response = await llm.invoke([new HumanMessage(prompt)]);
      return response.content;
    },
    {
      name: "summarize",
      spanType: mlflow.SpanType.LLM,
      inputs: { content },
    }
  );
}

// Main workflow using functional API (entrypoint)
const articleWorkflow = entrypoint(
  { checkpointer: false },
  async (topic) => {
    console.log(`\n📝 Generating article about: ${topic}`);

    // Step 1: Generate outline
    console.log("\n1️⃣ Generating outline...");
    const outline = await generateOutline(topic);
    console.log(`Outline:\n${outline}`);

    // Step 2: Generate content
    console.log("\n2️⃣ Generating content...");
    const content = await generateContent(topic, outline);
    console.log(`Content (first 200 chars):\n${content.substring(0, 200)}...`);

    // Step 3: Summarize
    console.log("\n3️⃣ Generating summary...");
    const summary = await summarize(content);
    console.log(`Summary:\n${summary}`);

    return {
      topic,
      outline,
      content,
      summary,
    };
  }
);

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

    // Initialize MLflow tracing with experiment ID
    initMLflow(experimentId);

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

    // Start a root span for the workflow
    await mlflow.withSpan(
      async () => {
        // Run the workflow
        const workflowResult = await articleWorkflow.invoke(topic);

        // Log metrics
        console.log("Logging metrics...");
        await logMetric(runId, "outline_length", workflowResult.outline.length);
        await logMetric(runId, "content_length", workflowResult.content.length);
        await logMetric(runId, "summary_length", workflowResult.summary.length);

        console.log("\n✅ Workflow completed successfully!");
        console.log(`\n📊 Results:`);
        console.log(`   Topic: ${workflowResult.topic}`);
        console.log(`   Outline length: ${workflowResult.outline.length} chars`);
        console.log(`   Content length: ${workflowResult.content.length} chars`);
        console.log(`   Summary length: ${workflowResult.summary.length} chars`);
      },
      {
        name: "article-workflow",
        spanType: mlflow.SpanType.CHAIN,
        inputs: { topic },
      }
    );

    // Mark run as finished
    console.log("Updating run status to FINISHED...");
    await updateRunStatus(runId, "FINISHED");
    console.log("Run completed and saved to MLflow.");

    console.log(`\n📈 View results and traces in MLflow UI: http://localhost:5000`);
    console.log(`🔍 Click on the run, then go to the "Traces" tab to see the trace tree`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

main();

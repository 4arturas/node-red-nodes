import { entrypoint, task } from "@langchain/langgraph";
import { ChatOllama } from "@langchain/ollama";
import { HumanMessage } from "@langchain/core/messages";
import dayjs from "dayjs";

// Helper to get experiment by name using REST API
async function getExperimentByName(name) {
  const response = await fetch(`http://localhost:5000/api/2.0/mlflow/experiments/get-by-name?experiment_name=${encodeURIComponent(name)}`);
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    // Return the data even on error so we can check lifecycle_stage
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
  const startTime = Date.now() * 1000; // Convert to microseconds
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
      timestamp: Date.now() * 1000, // Convert to microseconds
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

// Initialize Ollama LLM
const llm = new ChatOllama({
  model: "llama3.2",
  baseUrl: "http://localhost:11434",
  temperature: 0.7,
});

// Task 1: Generate outline using functional API
const generateOutline = task("generateOutline", async (topic) => {
  const prompt = `Create a brief outline for an article about: ${topic}`;
  const response = await llm.invoke([new HumanMessage(prompt)]);
  return response.content;
});

// Task 2: Generate content using functional API
const generateContent = task("generateContent", async ({ topic, outline }) => {
  const prompt = `Write a short article based on this outline:\n\n${outline}\n\nTopic: ${topic}`;
  const response = await llm.invoke([new HumanMessage(prompt)]);
  return response.content;
});

// Task 3: Summarize using functional API
const summarize = task("summarize", async (content) => {
  const prompt = `Summarize the following content in 2-3 sentences:\n\n${content}`;
  const response = await llm.invoke([new HumanMessage(prompt)]);
  return response.content;
});

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
    const content = await generateContent({ topic, outline });
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

// Run the workflow
async function main() {
  console.log("🚀 Starting MLflow + LangChain + Ollama Example");
  console.log("===============================================\n");

  const topic = "The Future of Artificial Intelligence";
  const experimentName = "langchain-ollama-example";

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
    const workflowResult = await articleWorkflow.invoke(topic);

    // Log metrics
    console.log("Logging metrics...");
    await logMetric(runId, "outline_length", workflowResult.outline.length);
    await logMetric(runId, "content_length", workflowResult.content.length);
    await logMetric(runId, "summary_length", workflowResult.summary.length);

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
    console.log(
      `\n📈 View results in MLflow UI: http://localhost:5000`
    );
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

main();

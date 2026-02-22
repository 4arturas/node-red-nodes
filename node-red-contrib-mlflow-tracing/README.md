# node-red-contrib-mlflow-tracing

MLflow tracing nodes for Node-RED. These nodes enable MLflow experiment tracking and tracing for AI/LLM workflows.

## Nodes

### mlflow-experiment

Get or create MLflow experiments.

**Inputs:**
- `msg.experimentName` - Name of the experiment (optional, can be configured in node)

**Outputs:**
- `msg.experimentId` - The experiment ID
- `msg.experiment` - Full experiment object
- `msg.existing` - Boolean indicating if experiment already existed

**Properties:**
- `Tracking URI` - MLflow tracking server URI (default: http://localhost:5000)
- `Experiment Name` - Name of the experiment
- `Operation` - get-by-name, create, or get-or-create

---

### mlflow-run

Create and manage MLflow runs.

**Inputs:**
- `msg.experimentId` - Parent experiment ID
- `msg.runName` - Name for the run (optional)

**Outputs:**
- `msg.runId` - The run ID
- `msg.run` - Full run object

**Properties:**
- `Tracking URI` - MLflow tracking server URI
- `Experiment ID` - Parent experiment ID
- `Run Name` - Name for the run
- `Operation` - create or update-status

---

### mlflow-log-param

Log parameters to MLflow runs.

**Inputs:**
- `msg.runId` - Run ID
- `msg.paramName` - Parameter name
- `msg.paramValue` - Parameter value

**Properties:**
- `Tracking URI` - MLflow tracking server URI
- `Run ID` - Run ID (can come from msg)
- `Param Name` - Parameter name
- `Param Value` - Parameter value

---

### mlflow-log-metric

Log metrics to MLflow runs.

**Inputs:**
- `msg.runId` - Run ID
- `msg.metricName` - Metric name
- `msg.metricValue` - Metric value (number)

**Properties:**
- `Tracking URI` - MLflow tracking server URI
- `Run ID` - Run ID (can come from msg)
- `Metric Name` - Metric name
- `Metric Value` - Metric value

---

### mlflow-span

Create traced spans for LLM operations.

**Inputs:**
- `msg.runId` - Run ID
- `msg.spanName` - Span name
- `msg.payload` - Content to process

**Properties:**
- `Tracking URI` - MLflow tracking server URI
- `Run ID` - Run ID (can come from msg)
- `Span Name` - Name of the span
- `Span Type` - Type of span (CHAIN, LLM, etc.)

---

## Installation

```bash
cd ~/.node-red
npm install /path/to/node-red-contrib-mlflow-tracing
```

## Example Flow

See `flows-mlflow-article.json` for a complete example flow that replicates the MLflow tracing example with LangChain and Ollama.

## License

MIT

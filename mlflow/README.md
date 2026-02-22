# MLflow + LangChain + Ollama Example

### 1. Start MLflow tracking server (using Docker)

```bash
# Stop any existing MLflow container first
docker ps --filter "ancestor=ghcr.io/mlflow/mlflow" -q | ForEach-Object { docker stop $_ }

# Start MLflow server with latest version (3.10.0+)
docker run --rm -p 5000:5000 --name mlflow-server ghcr.io/mlflow/mlflow:latest mlflow server --host 0.0.0.0 --port 5000
```

**Note:** MLflow 3.10.0+ supports the Traces API (`/v1/traces`)

### 2. Run the example

### 3. View results in MLflow UI

Open your browser to: http://localhost:5000


## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  generateOutline│────▶│  generateContent │────▶│    summarize    │
│     (task)      │     │      (task)      │     │     (task)      │
└─────────────────┘     └──────────────────┘     └──────────────────┘
         ▲                       ▲                        ▲
         └───────────────────────┼────────────────────────┘
                                 │
                    ┌─────────────────────┐
                    │  articleWorkflow    │
                    │     (entrypoint)    │
                    └─────────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────┐
                    │     MLflow          │
                    │   (REST API calls)  │
                    └─────────────────────┘
```
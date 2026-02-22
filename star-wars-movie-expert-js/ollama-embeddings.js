/**
 * Ollama Embeddings - Functional API using fetch
 * No LangChain, no classes, no http/https boilerplate
 */

const createOllamaEmbeddings = (options = {}) => {
  const baseUrl = options.baseUrl || 'http://localhost:11434';
  const model = options.model || 'mxbai-embed-large';

  const request = async (path, data) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
  };

  const embedQuery = async (text) => {
    const response = await request('/api/embeddings', {
      model,
      prompt: text
    });
    return response.embedding || [];
  };

  const embedDocuments = async (texts) => {
    const embeddings = [];
    for (const text of texts) {
      const embedding = await embedQuery(text);
      embeddings.push(embedding);
    }
    return embeddings;
  };

  return {
    embedQuery,
    embedDocuments
  };
};

export { createOllamaEmbeddings };

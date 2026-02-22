/**
 * Ollama Chat - Functional API using fetch
 * No LangChain, no classes, no http/https boilerplate
 */

const createOllamaChat = (options = {}) => {
  const baseUrl = options.baseUrl || 'http://localhost:11434';
  const model = options.model || 'qwen2.5:7b';
  const temperature = options.temperature || 0.7;

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

  const invoke = async (prompt) => {
    const response = await request('/api/generate', {
      model,
      prompt,
      stream: false,
      options: { temperature }
    });
    return response.response || '';
  };

  const chat = async (messages) => {
    const response = await request('/api/chat', {
      model,
      messages,
      stream: false,
      options: { temperature }
    });
    return response.message?.content || '';
  };

  return {
    invoke,
    chat
  };
};

export { createOllamaChat };

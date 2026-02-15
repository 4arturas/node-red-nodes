
```sh
npm i
````

Windows
```sh
cd C:\Users\4artu\.node-red
````
```sh
npm install C:\Users\4artu\IdeaProjects\node-red-nodes\node-red-contrib-chat-ollama
````

```json
{
  "model": "llama3.1",
  "messages": [
    { "role": "user", "content": "What is the weather in SF?" },
    { 
      "role": "assistant", 
      "tool_calls": [
        {
          "id": "call_abc123",
          "type": "function",
          "function": { "name": "get_weather", "arguments": "{\"location\": \"San Francisco, CA\"}" }
        }
      ]
    },
    { 
      "role": "tool", 
      "content": "Sunny, 72°F", 
      "tool_call_id": "call_abc123" 
    }
  ],
  "stream": false
}
````
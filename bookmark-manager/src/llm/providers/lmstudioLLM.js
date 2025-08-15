// LM Studio local server provider
// Expects options: { model?: string, baseUrl?: string }
// Default LM Studio server (REST): http://localhost:1234

export function createLMStudioLLM({ model = 'lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF', baseUrl = 'http://localhost:1234' } = {}) {
  // LM Studio aims to be OpenAI-compatible on the /v1 endpoints depending on server version.
  // We'll use chat/completions and models endpoints similar to OpenAI.
  return {
    name: 'lmstudio',
    async generate(prompt) {
      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0,
          stream: false,
        }),
      });
      if (!res.ok) throw new Error(`LM Studio API error ${res.status}`);
      const data = await res.json();
      return data?.choices?.[0]?.message?.content || '';
    },
    async listModels() {
      try {
        const res = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/models`, { method: 'GET' });
        if (!res.ok) return [model];
        const data = await res.json();
        const names = (data?.data || [])
          .map((m) => m?.id)
          .filter(Boolean);
        return Array.from(new Set([model, ...names]));
      } catch {
        return [model];
      }
    },
  };
}

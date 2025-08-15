// Grok (xAI) provider
// Expects options: { apiKey?: string, model?: string, baseUrl?: string }

export function createGrokLLM({ apiKey = '', model = 'grok-beta', baseUrl = 'https://api.x.ai/v1' } = {}) {
  return {
    name: 'grok',
    async generate(prompt) {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: apiKey ? `Bearer ${apiKey}` : undefined,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'user', content: prompt },
          ],
          temperature: 0,
        }),
      });
      if (!res.ok) throw new Error(`Grok API error ${res.status}`);
      const data = await res.json();
      // xAI API is OpenAI-compatible in many SDKs; adapt as needed
      return data?.choices?.[0]?.message?.content || '';
    },
    async listModels() {
      const fallback = [model, 'grok-beta']
        .filter(Boolean)
        .filter((v, i, a) => a.indexOf(v) === i);
      if (!apiKey) return fallback;
      try {
        const res = await fetch(`${baseUrl}/models`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) return fallback;
        const data = await res.json();
        const names = (data?.data || [])
          .map((m) => m?.id)
          .filter(Boolean);
        return Array.from(new Set([model, ...names]));
      } catch {
        return fallback;
      }
    },
  };
}

// Lightweight LLM provider abstraction
// Common interface: { generate(prompt: string): Promise<string> }

import { createGeminiLLM } from './providers/geminiLLM.js';
import { createOpenAILLM } from './providers/openaiLLM.js';
import { createGrokLLM } from './providers/grokLLM.js';
import { createOllamaLLM } from './providers/ollamaLLM.js';
import { createLMStudioLLM } from './providers/lmstudioLLM.js';

export const LLM_PROVIDERS = {
  GEMINI: 'gemini',
  OPENAI: 'openai', // ChatGPT
  GROK: 'grok',
  OLLAMA: 'ollama',
  LMSTUDIO: 'lmstudio',
};

export function createLLM(provider = LLM_PROVIDERS.GEMINI, options = {}) {
  const p = (provider || '').toString().toLowerCase();
  switch (p) {
    case LLM_PROVIDERS.OPENAI:
      return createOpenAILLM(options);
    case LLM_PROVIDERS.GROK:
      return createGrokLLM(options);
    case LLM_PROVIDERS.OLLAMA:
      return createOllamaLLM(options);
    case LLM_PROVIDERS.LMSTUDIO:
      return createLMStudioLLM(options);
    case LLM_PROVIDERS.GEMINI:
    default:
      return createGeminiLLM(options);
  }
}

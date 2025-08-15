import React, { useEffect, useState } from 'react';
import { LLM_PROVIDERS, createLLM } from '../llm/index.js';

// Options modal that displays and allows changing the current LLM provider and its options
const OptionsModal = ({ provider, providerOptions = {}, onChange, onChangeOptions, onClose }) => {
  const [models, setModels] = useState([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState('');

  const fetchModels = async () => {
    setIsLoadingModels(true);
    setModelsError('');
    try {
      const opts = {
        apiKey: providerOptions.apiKey || '',
        model: providerOptions.model || '',
        baseUrl: providerOptions.baseUrl || undefined,
      };
      const llm = createLLM(provider, opts);
      const list = (await llm.listModels?.()) || [];
      setModels(Array.isArray(list) ? list : []);
    } catch (e) {
      setModels([]);
      setModelsError(e?.message || 'Failed to load models');
    } finally {
      setIsLoadingModels(false);
    }
  };

  useEffect(() => {
    // Auto-fetch on open and when provider or core connection info changes
    fetchModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, providerOptions.apiKey, providerOptions.baseUrl]);

  const providerEntries = [
    { value: LLM_PROVIDERS.GEMINI, label: 'Gemini' },
    { value: LLM_PROVIDERS.OPENAI, label: 'OpenAI (ChatGPT)' },
    { value: LLM_PROVIDERS.GROK, label: 'Grok' },
    { value: LLM_PROVIDERS.OLLAMA, label: 'Ollama (Local)' },
  { value: LLM_PROVIDERS.LMSTUDIO, label: 'LM Studio (Local)' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Options</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close options">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label htmlFor="llm-provider" className="block text-sm font-medium text-gray-700 mb-1">LLM Provider</label>
              <select
                id="llm-provider"
                className="w-full border rounded-md px-3 py-2 bg-white text-gray-900"
                value={provider}
                onChange={(e) => onChange?.(e.target.value)}
              >
                {providerEntries.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Changes apply immediately and persist to this browser.</p>
            </div>
            {/* Provider-specific settings */}
            {(provider === LLM_PROVIDERS.GEMINI || provider === LLM_PROVIDERS.OPENAI || provider === LLM_PROVIDERS.GROK) && (
              <div className="space-y-3">
                <div>
                  <label htmlFor="api-key" className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                  <input
                    id="api-key"
                    type="password"
                    className="w-full border rounded-md px-3 py-2"
                    placeholder="Enter API key"
                    value={providerOptions.apiKey || ''}
                    onChange={(e) => onChangeOptions?.({ apiKey: e.target.value })}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="model" className="block text-sm font-medium text-gray-700">Model</label>
                    <button
                      type="button"
                      onClick={fetchModels}
                      className="text-xs text-blue-600 hover:underline disabled:text-gray-400"
                      disabled={isLoadingModels}
                      aria-label="Refresh model list"
                    >{isLoadingModels ? 'Loading…' : 'Refresh'}</button>
                  </div>
                  {models && models.length > 0 ? (
                    <select
                      id="model"
                      className="w-full border rounded-md px-3 py-2 bg-white text-gray-900"
                      value={providerOptions.model || models[0] || ''}
                      onChange={(e) => onChangeOptions?.({ model: e.target.value })}
                    >
                      {models.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id="model"
                      type="text"
                      className="w-full border rounded-md px-3 py-2"
                      placeholder={provider === LLM_PROVIDERS.GEMINI ? 'gemini-2.0-flash' : provider === LLM_PROVIDERS.OPENAI ? 'gpt-4o-mini' : 'grok-beta'}
                      value={providerOptions.model || ''}
                      onChange={(e) => onChangeOptions?.({ model: e.target.value })}
                    />
                  )}
                  {modelsError && <p className="text-xs text-red-600 mt-1">{modelsError}</p>}
                </div>
                {(provider === LLM_PROVIDERS.OPENAI || provider === LLM_PROVIDERS.GROK) && (
                  <div>
                    <label htmlFor="base-url" className="block text-sm font-medium text-gray-700 mb-1">Base URL (optional)</label>
                    <input
                      id="base-url"
                      type="text"
                      className="w-full border rounded-md px-3 py-2"
                      placeholder={provider === LLM_PROVIDERS.OPENAI ? 'https://api.openai.com/v1' : 'https://api.x.ai/v1'}
                      value={providerOptions.baseUrl || ''}
                      onChange={(e) => onChangeOptions?.({ baseUrl: e.target.value })}
                    />
                  </div>
                )}
              </div>
            )}
            {(provider === LLM_PROVIDERS.OLLAMA || provider === LLM_PROVIDERS.LMSTUDIO) && (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="ollama-model" className="block text-sm font-medium text-gray-700">Model</label>
                    <button
                      type="button"
                      onClick={fetchModels}
                      className="text-xs text-blue-600 hover:underline disabled:text-gray-400"
                      disabled={isLoadingModels}
                      aria-label="Refresh model list"
                    >{isLoadingModels ? 'Loading…' : 'Refresh'}</button>
                  </div>
                  {models && models.length > 0 ? (
                    <select
                      id="ollama-model"
                      className="w-full border rounded-md px-3 py-2 bg-white text-gray-900"
                      value={providerOptions.model || models[0] || ''}
                      onChange={(e) => onChangeOptions?.({ model: e.target.value })}
                    >
                      {models.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id="ollama-model"
                      type="text"
                      className="w-full border rounded-md px-3 py-2"
                      placeholder={provider === LLM_PROVIDERS.OLLAMA ? 'llama3.1' : 'lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF'}
                      value={providerOptions.model || ''}
                      onChange={(e) => onChangeOptions?.({ model: e.target.value })}
                    />
                  )}
                  {modelsError && <p className="text-xs text-red-600 mt-1">{modelsError}</p>}
                </div>
                <div>
                  <label htmlFor="ollama-url" className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
                  <input
                    id="ollama-url"
                    type="text"
                    className="w-full border rounded-md px-3 py-2"
                    placeholder={provider === LLM_PROVIDERS.OLLAMA ? 'http://localhost:11434' : 'http://localhost:1234'}
                    value={providerOptions.baseUrl || ''}
                    onChange={(e) => onChangeOptions?.({ baseUrl: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end mt-6">
            <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptionsModal;

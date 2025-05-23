import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useOpenRouterModels } from '../hooks/useOpenRouterModels';
import { useAI } from '../context/AIContext';
import { ModelOption } from '../types';

interface ConfigPanelProps {
  onAiStatusChange: (status: 'Inactive' | 'Active' | 'Error') => void;
  onConfigChange: (config: any) => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ onAiStatusChange, onConfigChange }) => {
  const { aiConfig, isEnabled } = useAI();

  const [apiKey, setApiKey] = useState(aiConfig.apiKey || '');
  const [captureInterval, setCaptureInterval] = useState(aiConfig.captureInterval || 2000);
  const [gameContext, setGameContext] = useState(aiConfig.gameContext || '');
  const [apiKeyStatus, setApiKeyStatus] = useState<'unchecked' | 'valid' | 'invalid'>(
    aiConfig.apiKey ? 'valid' : 'unchecked'
  );
  const [apiKeyMessage, setApiKeyMessage] = useState<string | null>(null);

  const defaultVisionModels: ModelOption[] = [
    { id: 'anthropic/claude-3-opus-20240229', name: 'Claude 3 Opus', hasVision: true },
    { id: 'anthropic/claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', hasVision: true },
    { id: 'google/gemini-1.5-flash-preview', name: 'Gemini 1.5 Flash', hasVision: true }
  ];

  const { allModels, isLoadingModels, modelName, setModelName } = useOpenRouterModels(
    apiKey,
    apiKeyStatus,
    defaultVisionModels
  );
  // Find the currently selected model - RE-ADD THIS
  const selectedModel = allModels.find(model => model.id === modelName);

  const handleSelectModel = (modelId: string) => {
    setModelName(modelId);
    localStorage.setItem('aiModelName', modelId);
  };

  useEffect(() => {
    if (!apiKey) {
      setApiKeyStatus('unchecked');
      setApiKeyMessage(null);
      localStorage.removeItem('aiApiKey');
      setModelName(''); // Clear model name
      localStorage.removeItem('aiModelName'); // Clear model name from storage
      return;
    }

    if (apiKey.length > 0 && apiKey.length < 20) {
      setApiKeyStatus('invalid');
      setApiKeyMessage('API key must be at least 20 characters long.');
      localStorage.removeItem('aiApiKey');
      // setModelName(''); // Optionally clear model if key is invalid
      // localStorage.removeItem('aiModelName');
    } else if (apiKey.length >= 20) {
      setApiKeyStatus('valid');
      setApiKeyMessage('API key format valid.'); // Simplified message
      localStorage.setItem('aiApiKey', apiKey); // Save valid API key immediately
    } else {
      // This case should ideally be caught by !apiKey, but as a fallback:
      setApiKeyStatus('unchecked');
      setApiKeyMessage(null);
    }
  }, [apiKey, setModelName]);

  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const newConfig = {
      apiKey,
      modelName: modelName || '',
      captureInterval,
      gameContext
    };
    // Debounce the config change
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(() => {
      onConfigChange(newConfig);
    }, 300);
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [apiKey, modelName, captureInterval, gameContext, onConfigChange]);

  const toggleAI = () => {
    onAiStatusChange(isEnabled ? 'Inactive' : 'Active');
  };

  return (
    <div>
      {/* API Key input */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          OpenRouter API Key:
        </label>
        <div className="relative">
          <input
            type="password"
            className="input-field pr-10"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value); // Only set API key here
            }}
            placeholder="Enter your OpenRouter API key"
          />
          <button
            onClick={() => {
              // Open OpenRouter in a new tab
              window.open('https://openrouter.ai/keys', '_blank');
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-300"
            title="Get an API key from OpenRouter"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        </div>
        {/* Display API key validation message */}
        {apiKeyMessage && (
          <p className={`text-sm mt-1 ${
            apiKeyStatus === 'invalid' ? 'text-red-500' :
            apiKeyStatus === 'valid' ? 'text-green-500' :
            'text-yellow-500' /* For 'unchecked' if it has a message */
          }`}>
            {apiKeyMessage}
          </p>
        )}
      </div>

      {/* Model selection */}
      <div className="mb-4">
        <label htmlFor="ai-model-select" className="block text-sm font-medium mb-1">
          AI Model:
        </label>
        <select
          id="ai-model-select"
          className="input-field"
          value={modelName || ''}
          onChange={(e) => handleSelectModel(e.target.value)}
          disabled={!apiKey || isLoadingModels || apiKeyStatus !== 'valid'} // Ensure apiKey is valid before enabling
        >
          {isLoadingModels && <option value="">Loading models...</option>}
          {!isLoadingModels && allModels.length === 0 && apiKeyStatus === 'valid' && (
            <option value="">No models found for this API key.</option>
          )}
          {!isLoadingModels && allModels.length === 0 && apiKeyStatus !== 'valid' && (
            <option value="">Enter a valid API key to load models.</option>
          )}
          {allModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} {model.hasVision ? '(Vision)' : ''}
            </option>
          ))}
        </select>
        {isLoadingModels && apiKeyStatus === 'valid' && <p className="text-sm text-blue-400">Loading models...</p>}
      </div>

      {/* Capture interval */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Capture Interval (ms):
        </label>
        <input
          type="number"
          className="input-field"
          value={captureInterval}
          onChange={(e) => setCaptureInterval(Number(e.target.value))}
          min="100"
          max="5000"
          step="100"
        />
        <p className="text-xs text-gray-400 mt-1">
          Lower values make the AI respond faster but use more API calls.
        </p>
      </div>

      {/* Game context */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Task instructions
        </label>
        <textarea
          className="input-field min-h-[100px]"
          value={gameContext}
          onChange={(e) => setGameContext(e.target.value)}
          placeholder="Add instructions for the AI on how to play this game..."
        />
        <p className="text-xs text-gray-400 mt-1">
          Adding game-specific context helps the AI make better decisions.
        </p>
      </div>

      {/* AI Active Toggle Button */}
      <div className="mb-4">
        <button
          onClick={toggleAI}
          className={`w-full py-2 px-4 rounded font-semibold transition-colors
            ${isEnabled && apiKeyStatus === 'valid' && selectedModel
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-gray-600 hover:bg-gray-500 text-gray-300 cursor-not-allowed'}`}
          disabled={!apiKey || apiKeyStatus !== 'valid' || !selectedModel}
        >
          {isEnabled ? 'Deactivate AI' : 'Activate AI'}
        </button>
        {(!apiKey || apiKeyStatus !== 'valid' || !selectedModel) && (
          <p className="text-xs text-yellow-400 mt-1">
            Please enter a valid API key and select a model to activate AI.
          </p>
        )}
      </div>
    </div>
  );
};

export default ConfigPanel;

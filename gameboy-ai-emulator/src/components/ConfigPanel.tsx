import React, { useState, useEffect } from 'react';
import { useOpenRouterModels } from '../hooks/useOpenRouterModels';
import { useAI } from '../context/AIContext';
import ModelSelectionModal from './ModelSelectionModal';
import { ModelOption } from '../types';

interface ConfigPanelProps {
  onAiStatusChange: (status: 'Inactive' | 'Active' | 'Error') => void;
  onConfigChange: (config: any) => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ onAiStatusChange, onConfigChange }) => {
  // Get AI Context
  const { aiConfig, isEnabled } = useAI();

  // Local state for API key and capture interval
  const [apiKey, setApiKey] = useState(aiConfig.apiKey || '');
  const [captureInterval, setCaptureInterval] = useState(aiConfig.captureInterval || 2000);
  const [gameContext, setGameContext] = useState(aiConfig.gameContext || '');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<'unchecked' | 'valid' | 'invalid'>(
    apiKey ? 'valid' : 'unchecked'
  );

  // Create default vision models
  const defaultVisionModels: ModelOption[] = [
    { id: 'anthropic/claude-3-opus-20240229', name: 'Claude 3 Opus', hasVision: true },
    { id: 'anthropic/claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', hasVision: true },
    { id: 'google/gemini-1.5-flash-preview', name: 'Gemini 1.5 Flash', hasVision: true }
  ];

  // Get models from OpenRouter
  const { allModels, isLoadingModels, modelName, setModelName } = useOpenRouterModels(
    apiKey,
    apiKeyStatus,
    defaultVisionModels
  );

  // Find the currently selected model
  const selectedModel = allModels.find(model => model.id === modelName);

  // Update selected model
  const handleSelectModel = (modelId: string) => {
    setModelName(modelId);
    localStorage.setItem('aiModelName', modelId);
  };

  // Update config when main inputs change
  useEffect(() => {
    onConfigChange({
      apiKey,
      modelName: modelName || '',
      captureInterval,
      gameContext
    });
  }, [apiKey, modelName, captureInterval, gameContext, onConfigChange]);

  // Format the label for validation feedback
  const getKeyValidationMessage = () => {
    if (!apiKey) return null;
    
    // Simple validation - just check if key looks like a valid API key
    if (apiKey.length < 20) {
      setApiKeyStatus('invalid');
      return <p className="text-red-500 text-sm">API key is too short</p>;
    }
    
    setApiKeyStatus('valid');
    return <p className="text-green-500 text-sm">API key is valid.</p>;
  };

  const toggleAI = () => {
    onAiStatusChange(isEnabled ? 'Inactive' : 'Active');
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
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
            onChange={(e) => setApiKey(e.target.value)}
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
        {getKeyValidationMessage()}
      </div>

      {/* Model selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          AI Model:
        </label>
        <button
          className="input-field text-left flex justify-between items-center"
          onClick={openModal}
          disabled={!apiKey}
        >
          <span className={!selectedModel ? "text-gray-500" : ""}>
            {selectedModel ? selectedModel.name : 'Select a model'}
          </span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isLoadingModels && <p className="text-sm text-blue-400">Loading models...</p>}
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

      {/* AI Control */}
      <div className="mt-6">
        <button
          onClick={toggleAI}
          disabled={!selectedModel || !apiKey}
          className={`w-full py-2 px-4 font-medium rounded-md ${
            isEnabled
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          } transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isEnabled ? 'Deactivate AI' : 'Activate AI'}
        </button>
      </div>

      {/* Modal for model selection */}
      <ModelSelectionModal
        isOpen={isModalOpen}
        onClose={closeModal}
        models={allModels}
        onModelSelect={handleSelectModel}
        currentModelId={modelName}
        isLoading={isLoadingModels}
        apiKeyStatus={apiKeyStatus}
      />
    </div>
  );
};

export default ConfigPanel;

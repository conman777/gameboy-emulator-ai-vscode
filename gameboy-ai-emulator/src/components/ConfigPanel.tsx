import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ModelOption } from '../types';
import { useApiKeyValidation } from '../hooks/useApiKeyValidation';
import { useOpenRouterModels } from '../hooks/useOpenRouterModels';
import StablePanel from './StablePanel';
import ModelSelectionModal from './ModelSelectionModal';

// Define defaultVisionModels outside the component so it's a stable reference
const defaultVisionModels: ModelOption[] = [
  { id: 'openai/gpt-4o', name: 'GPT-4o', hasVision: true },
  { id: 'openai/gpt-4-vision-preview', name: 'GPT-4 Vision Preview', hasVision: true },
  { id: 'anthropic/claude-3-opus-20240229-v1:0', name: 'Claude 3 Opus', hasVision: true },
  { id: 'anthropic/claude-3-sonnet-20240229-v1:0', name: 'Claude 3 Sonnet', hasVision: true },
  { id: 'anthropic/claude-3-haiku-20240307-v1:0', name: 'Claude 3 Haiku', hasVision: true },
  { id: 'google/gemini-1.0-pro-vision-001', name: 'Google Gemini Pro Vision', hasVision: true },
  { id: 'google/gemini-pro-vision', name: 'Google Gemini Pro Vision', hasVision: true },
  { id: 'mistralai/mistral-large-latest', name: 'Mistral Large', hasVision: true },
  { id: 'mistralai/mistral-large-vision', name: 'Mistral Large Vision', hasVision: true },
  { id: 'meta-llama/llama-3-70b-vision', name: 'Meta Llama 3-70B Vision', hasVision: true },
  { id: 'meta-llama/llama-3-8b-vision', name: 'Meta Llama 3-8B Vision', hasVision: true },
  { id: 'stability-ai/stable-diffusion-3-medium', name: 'Stable Diffusion 3 Medium', hasVision: true },
  { id: 'perplexity/sonar-medium-online', name: 'Perplexity Sonar Medium Online', hasVision: true },
  { id: 'perplexity/sonar-small-online', name: 'Perplexity Sonar Small Online', hasVision: true },
  { id: 'deepseek/deepseek-vl-7b-chat', name: 'DeepSeek VL 7B Chat', hasVision: true },
  { id: 'cohere/command-r-plus', name: 'Cohere Command R+', hasVision: true },
  { id: 'anthropic/claude-2.1', name: 'Claude 2.1', hasVision: true },
  { id: 'anthropic/claude-2.0', name: 'Claude 2.0', hasVision: true },
  { id: 'openrouter/auto', name: 'OpenRouter Auto (Best Available)', hasVision: true }
];

interface ConfigPanelProps {
  onAiStatusChange?: (status: 'Inactive' | 'Active' | 'Error') => void;
  onConfigChange?: (config: {
    apiKey: string,
    modelName: string,
    captureInterval: number,
    gameContext: string
  }) => void;
}

// Use React.memo with custom comparison to prevent unnecessary re-renders
const ConfigPanel: React.FC<ConfigPanelProps> = React.memo(({ onAiStatusChange, onConfigChange }) => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('aiApiKey') || '');
  const [isAiActive, setIsAiActive] = useState(false);
  const [captureInterval, setCaptureInterval] = useState(() => {
    const saved = localStorage.getItem('aiCaptureInterval');
    return saved ? parseInt(saved) : 2000;
  });
  const [gameContext, setGameContext] = useState(() => localStorage.getItem('aiGameContext') || '');
  const [showModelModal, setShowModelModal] = useState(false); // Added state for modal visibility

  const { apiKeyStatus, apiKeyMessage, setApiKeyMessage: setHookApiKeyMessage } = useApiKeyValidation(apiKey);
  
  const { 
    allModels, 
    isLoadingModels, 
    modelName, 
    setModelName 
  } = useOpenRouterModels(apiKey, apiKeyStatus, defaultVisionModels);

  // useEffect for saving config remains the same
  useEffect(() => {
    if (apiKey) localStorage.setItem('aiApiKey', apiKey);
    // If modelName is removed from UI, we might not want to save it, or save a default.
    // For now, let's keep saving it as it might be set programmatically or from localStorage.
    if (modelName) localStorage.setItem('aiModelName', modelName);
    localStorage.setItem('aiCaptureInterval', captureInterval.toString());
    if (gameContext) localStorage.setItem('aiGameContext', gameContext);
    
    if (onConfigChange) {
      onConfigChange({
        apiKey,
        modelName,
        captureInterval,
        gameContext
      });
    }
  }, [apiKey, modelName, captureInterval, gameContext, onConfigChange]);

  const toggleAI = useCallback(() => {
    if (!apiKey || !modelName || apiKeyStatus !== 'valid') { // modelName is still checked here
      setHookApiKeyMessage('Valid API key and model required to activate AI.'); 
      return;
    }
    
    const newState = !isAiActive;
    setIsAiActive(newState);
    
    if (onAiStatusChange) {
      onAiStatusChange(newState ? 'Active' : 'Inactive');
    }
  }, [apiKey, modelName, apiKeyStatus, isAiActive, onAiStatusChange, setHookApiKeyMessage]);  const headerContent = (
    <div className="flex items-center">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
      </svg>
      AI Configuration
    </div>
  );
  
  return (
    <StablePanel
      title={headerContent}
      className="bg-indigo-900 bg-opacity-60 border border-indigo-700"
      titleClassName="text-xl font-bold text-white mb-4 p-6 pb-2"
      contentClassName="space-y-4 p-6 pt-0"
    >
      
      <div className="space-y-4">
        {/* API Key Input Section - remains the same */}
        <div className="relative mb-4">
          <label htmlFor="api-key" className="block font-medium text-indigo-200 mb-1">
            OpenRouter API Key:
          </label>
          <div className="flex">
            <input 
              id="api-key"
              type="password" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your OpenRouter API key" 
              className={`w-full px-3 py-2 bg-indigo-800 bg-opacity-50 text-white border ${apiKeyStatus === 'valid' ? 'border-green-500' : apiKeyStatus === 'invalid' ? 'border-red-500' : 'border-indigo-600'} rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50`}
              disabled={isAiActive}
            />
            <a 
              href="https://openrouter.ai/keys" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="ml-2 px-3 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-md flex items-center"
              title="Get API key from OpenRouter"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
          <div className={`text-sm mt-1 ${apiKeyStatus === 'valid' ? 'text-green-400' : apiKeyStatus === 'invalid' ? 'text-red-400' : 'text-indigo-300'}`}>
            {apiKeyMessage || (apiKeyStatus === 'unchecked' && !apiKey ? 'Enter your OpenRouter API key.' : apiKeyStatus === 'unchecked' && apiKey ? 'Validating API key...' : '')}
          </div>
          
          {apiKeyStatus === 'invalid' && (
            <div className="text-sm mt-1 text-yellow-300">
              <p>Tips for OpenRouter API keys:</p>
              <ul className="list-disc pl-5 mt-1">
                <li>Ensure your key is from <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="underline">OpenRouter</a> (not OpenAI)</li>
                <li>API keys should begin with "sk-or-" followed by random characters</li>
                <li>Check that your account has sufficient credits</li>
                <li>Try generating a new key if problems persist</li>
              </ul>
            </div>
          )}
        </div>
        
        {/* AI Model section: Button to open Modal */}
        {/* Container for the AI Model label, button, and status messages */}
        <div> 
          <label className="block text-sm font-medium text-indigo-200 mb-1">
            AI Model:
          </label>
          
          <button
            onClick={() => setShowModelModal(true)}
            className="w-full px-3 py-2 bg-indigo-700 hover:bg-indigo-600 text-white border border-indigo-500 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed flex justify-between items-center"
            disabled={isAiActive || apiKeyStatus !== 'valid'}
          >
            <span>
              {modelName ? `${modelName.split('/').pop() || modelName}` : 'Select a Model'}
              {modelName && allModels.find(m => m.id === modelName)?.hasVision && <span className="text-xs text-cyan-300 ml-2">(Vision)</span>}
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          {/* Container for status messages with a fixed height and vertically centered content */}
          <div className="h-[20px] mt-1 flex items-center"> 
            {apiKeyStatus !== 'valid' ? (
              <p className="text-xs text-yellow-300 m-0 p-0 leading-none">
                A valid API key is required to select a model.
              </p>
            ) : isLoadingModels ? ( 
              <p className="text-xs text-indigo-300 m-0 p-0 leading-none">Loading models...</p>
            ) : allModels.length === 0 ? ( 
              <p className="text-xs text-yellow-300 m-0 p-0 leading-none">
                No models loaded. Check API key or network.
              </p>
            ) : (
              <span /> // Empty span to maintain layout if no message is shown
            )}
          </div>
        </div>
        
        {/* Capture Interval Section - remains the same */}
        <div>
          <label htmlFor="capture-interval" className="block text-sm font-medium text-indigo-200 mb-1">
            Capture Interval (ms)
          </label>
          <input 
            id="capture-interval"
            type="number" 
            min="500"
            max="10000"
            step="100"
            value={captureInterval}
            onChange={(e) => setCaptureInterval(parseInt(e.target.value))}
            className="w-full px-3 py-2 bg-indigo-800 bg-opacity-50 text-white border border-indigo-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            disabled={isAiActive}
          />
          <p className="text-xs mt-1 text-indigo-300">
            Lower values make the AI respond faster but use more API calls.
          </p>
        </div>
        
        {/* Game Context Section - remains the same */}
        <div>
          <label htmlFor="game-context" className="block text-sm font-medium text-indigo-200 mb-1">
            Game Context
          </label>
          <textarea 
            id="game-context"
            value={gameContext}
            onChange={(e) => setGameContext(e.target.value)}
            placeholder="Provide optional context about the game to help the AI (e.g., game title, goals, controls)"
            className="w-full px-3 py-2 bg-indigo-800 bg-opacity-50 text-white border border-indigo-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            rows={3}
            disabled={isAiActive}
          />
          <p className="text-xs mt-1 text-indigo-300">
            Adding game-specific context helps the AI make better decisions.
          </p>
        </div>
        
        {/* AI Control Button Section - remains the same */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm font-medium text-indigo-200">AI Control</span>
          <button
            onClick={toggleAI}
            className={`px-4 py-2 rounded-lg font-medium transition-colors
                      ${!apiKey || !modelName || apiKeyStatus !== 'valid'
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                        : isAiActive 
                          ? 'bg-red-600 text-white hover:bg-red-700' 
                          : 'bg-green-600 text-white hover:bg-green-700'}`}

            disabled={!apiKey || !modelName || apiKeyStatus !== 'valid'}
          >
            {isAiActive ? 'Deactivate AI' : 'Activate AI'}
          </button>
        </div>
      </div>

      {/* Model Selection Modal */}
      {showModelModal && (
        <ModelSelectionModal 
          isOpen={showModelModal}
          onClose={() => setShowModelModal(false)}
          onModelSelect={(selectedModelId) => { // Renamed from modelId to selectedModelId for clarity
            setModelName(selectedModelId);
            setShowModelModal(false);
          }}
          models={allModels} // Pass allModels as models
          isLoading={isLoadingModels} // Pass isLoadingModels as isLoading
          currentModelId={modelName} // Pass modelName as currentModelId
          apiKeyStatus={apiKeyStatus}
          // defaultVisionModels prop is removed as it's not used by ModelSelectionModal
        />
      )}
    </StablePanel>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  return (
    prevProps.onAiStatusChange === nextProps.onAiStatusChange &&
    prevProps.onConfigChange === nextProps.onConfigChange
  );
});

export default ConfigPanel;

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ModelOption } from '../types';
import { useApiKeyValidation } from '../hooks/useApiKeyValidation';
import { useOpenRouterModels } from '../hooks/useOpenRouterModels';

interface ConfigPanelProps {
  onAiStatusChange?: (status: 'Inactive' | 'Active' | 'Error') => void;
  onConfigChange?: (config: {
    apiKey: string,
    modelName: string,
    captureInterval: number,
    gameContext: string
  }) => void;
}

// Use React.memo to prevent unnecessary re-renders
const ConfigPanel: React.FC<ConfigPanelProps> = React.memo(({ onAiStatusChange, onConfigChange }) => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('aiApiKey') || '');
  const [isAiActive, setIsAiActive] = useState(false);
  const [captureInterval, setCaptureInterval] = useState(() => {
    const saved = localStorage.getItem('aiCaptureInterval');
    return saved ? parseInt(saved) : 2000;
  });
  const [gameContext, setGameContext] = useState(() => localStorage.getItem('aiGameContext') || '');
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [showVisionOnly, setShowVisionOnly] = useState(true);

  // Default models that are known to support vision capabilities
  // This list is passed to the useOpenRouterModels hook as a fallback.
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

  const { apiKeyStatus, apiKeyMessage, setApiKeyMessage: setHookApiKeyMessage } = useApiKeyValidation(apiKey);
  
  const { 
    allModels, 
    isLoadingModels, 
    modelName, 
    setModelName 
  } = useOpenRouterModels(apiKey, apiKeyStatus, defaultVisionModels);

  // Local state for UI-filtered models, derived from hook's allModels
  const [uiFilteredModels, setUiFilteredModels] = useState<ModelOption[]>([]);

  // useEffect for API key validation and initial model loading are now handled by the custom hooks.

  // REMOVED problematic useEffect that was here:
  // // Handle manual model input - This will now use setAllModels from the hook
  // useEffect(() => {
  //   if (modelName && !allModels.some(model => model.id === modelName)) {
  //     // ... (Previous logic that called setAllModels from the hook)
  //   }
  // }, [modelName, allModels, setAllModels]); // This effect is removed.

  // ADDED: Create an augmented list of models using useMemo
  // This list includes models from the hook and the current modelName if it's custom/not yet in the hook's list.
  const augmentedModels = useMemo(() => {
    let currentModels = allModels; // allModels is from the useOpenRouterModels hook
    if (modelName && !currentModels.some(m => m.id === modelName)) {
      const mightHaveVision =
        modelName.toLowerCase().includes('gpt-4') ||
        modelName.toLowerCase().includes('gpt4') ||
        modelName.toLowerCase().includes('claude-3') ||
        modelName.toLowerCase().includes('gemini') ||
        modelName.toLowerCase().includes('llama-3') ||
        modelName.toLowerCase().includes('vision');
      
      const customModel: ModelOption = {
        id: modelName,
        name: modelName.split('/').pop() || modelName, // Generate a display name
        hasVision: mightHaveVision
      };
      // Add the custom/persisted model to a new array for augmentation
      currentModels = [...currentModels, customModel];
    }
    return currentModels;
  }, [modelName, allModels]);

  // MODIFIED: Filter models based on search query and vision capability toggle, using augmentedModels
  useEffect(() => {
    if (augmentedModels.length > 0) { // Use augmentedModels
      const filtered = augmentedModels.filter(model => { // Use augmentedModels
        if (showVisionOnly && !model.hasVision) {
          return false;
        }
        if (modelSearchQuery && !model.name.toLowerCase().includes(modelSearchQuery.toLowerCase()) && 
            !model.id.toLowerCase().includes(modelSearchQuery.toLowerCase())) {
          return false;
        }
        return true;
      });
      setUiFilteredModels(filtered);
    } else {
      setUiFilteredModels([]); // Ensure it's empty if augmentedModels is empty
    }
  }, [augmentedModels, showVisionOnly, modelSearchQuery]); // Dependency changed to augmentedModels

  // Save config to localStorage and inform parent components when config changes
  useEffect(() => {
    if (apiKey) localStorage.setItem('aiApiKey', apiKey);
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
    if (!apiKey || !modelName || apiKeyStatus !== 'valid') {
      setHookApiKeyMessage('Valid API key and model required to activate AI.'); 
      return;
    }
    
    const newState = !isAiActive;
    setIsAiActive(newState);
    
    if (onAiStatusChange) {
      onAiStatusChange(newState ? 'Active' : 'Inactive');
    }
  }, [apiKey, modelName, apiKeyStatus, isAiActive, onAiStatusChange, setHookApiKeyMessage]);

  return (
    <div 
      className="space-y-4 p-6 bg-indigo-900 bg-opacity-60 rounded-lg shadow-lg border border-indigo-700" 
      style={{
        // Add CSS to prevent flickering
        transform: 'translateZ(0)', // Force GPU acceleration
        backfaceVisibility: 'hidden',
        perspective: '1000px',
        willChange: 'transform', // Hint to the browser
        position: 'relative' // Position relative to keep it in the flow
      }}
    >
      <h3 className="text-xl font-bold text-white mb-4 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
        AI Configuration
      </h3>
      
      <div className="space-y-4">
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
        
        <div>
          <label htmlFor="model-select" className="block text-sm font-medium text-indigo-200 mb-1">
            AI Model
          </label>
          
          {isLoadingModels ? (
            <div className="w-full px-3 py-2 bg-indigo-800 bg-opacity-50 text-indigo-300 border border-indigo-600 rounded-md">
              Loading models... <span className="animate-pulse">⏳</span>
            </div>
          ) : augmentedModels.length > 0 ? ( // MODIFIED: Check augmentedModels.length for the main condition
            <>
              <div className="flex items-center mb-2">
                <input 
                  id="vision-filter"
                  type="checkbox"
                  checked={showVisionOnly}
                  onChange={(e) => setShowVisionOnly(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  disabled={isAiActive || isLoadingModels}
                />
                <label htmlFor="vision-filter" className="ml-2 block text-sm text-indigo-200">
                  Show vision-capable models only
                </label>
              </div>
              
              <div className="relative mb-2">
                <input 
                  type="text"
                  value={modelSearchQuery}
                  onChange={(e) => setModelSearchQuery(e.target.value)}
                  placeholder="Search models by name or ID..."
                  className="w-full px-3 py-2 bg-indigo-800 bg-opacity-50 text-white border border-indigo-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 mb-1"
                  disabled={isAiActive || isLoadingModels}
                />
              </div>
              

              <select 
                id="model-select"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)} // setModelName from hook handles the state
                className="w-full px-3 py-2 bg-indigo-800 bg-opacity-50 text-white border border-indigo-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                disabled={isAiActive || isLoadingModels}
              >
                {/* Ensure current selection is always an option, using augmentedModels for details */}
                {modelName && !uiFilteredModels.some(m => m.id === modelName) && (() => {
                  // MODIFIED: Find details from augmentedModels for consistency
                  const modelDetails = augmentedModels.find(m => m.id === modelName);
                  const name = modelDetails ? modelDetails.name : (modelName.split('/').pop() || modelName);
                  const hasVision = modelDetails ? modelDetails.hasVision : false; 
                  return (
                    <option key={modelName} value={modelName}>
                      {name}{hasVision ? " (Vision)" : ""} (Current Selection)
                    </option>
                  );
                })()}
                {uiFilteredModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}{model.hasVision ? " (Vision)" : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs mt-2 text-indigo-300">
                {/* MODIFIED: Use augmentedModels.length for the total count */}
                Showing {uiFilteredModels.length} of {augmentedModels.length} models.
                {showVisionOnly ? ' (Vision-capable only)' : ''}
                {modelSearchQuery ? ` (matching "${modelSearchQuery}")` : ''}

              </p>
            </>
          ) : (
            <div className="w-full px-3 py-2 bg-indigo-800 bg-opacity-50 text-indigo-300 border border-indigo-600 rounded-md">
              No models available.
              {apiKeyStatus !== 'valid' && ' Please check your API key.'}
              {apiKeyStatus === 'valid' && !isLoadingModels && ' Could not fetch models from OpenRouter, or no models match current filters.'}
              {apiKeyStatus === 'valid' && isLoadingModels && ' Still attempting to load models...'}
            </div>
          )}
        </div>
        
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
    </div>
  );
});

export default ConfigPanel;

import { useState, useEffect, useCallback } from 'react';
import { getAvailableModels } from '../services/AIService'; 
import { OpenRouterModel, ModelOption } from '../types';

// Function to determine if a model has vision capabilities
const mapOpenRouterToModelOption = (model: OpenRouterModel): ModelOption => ({
  id: model.id,
  name: model.name,
  // Determine vision capability based on model properties
  hasVision: 
    Array.isArray(model.capabilities) && (
      model.capabilities.includes('vision') || 
      model.capabilities.includes('multimodal')
    ) ||
    // Common identifiers in the name or ID
    model.id.toLowerCase().includes('vision') ||
    model.name.toLowerCase().includes('vision') ||
    model.id.toLowerCase().includes('gpt-4o') ||
    model.id.toLowerCase().includes('claude-3') ||
    model.id.toLowerCase().includes('gemini') ||
    model.id.toLowerCase().includes('llava')
});

export const useOpenRouterModels = (
  apiKey: string,
  apiKeyStatus: 'unchecked' | 'valid' | 'invalid',
  defaultVisionModels: ModelOption[] 
) => {
  const [allModels, setAllModels] = useState<ModelOption[]>(defaultVisionModels);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelName, setModelName] = useState(() => localStorage.getItem('aiModelName') || '');

  const loadModels = useCallback(async () => {
    if (apiKey && apiKeyStatus === 'valid') {
      setIsLoadingModels(true);
      try {
        // console.log('Fetching all models with API key (from hook)'); // Less verbose logging
        const fetchedModels: OpenRouterModel[] = await getAvailableModels(apiKey);
        // console.log('Loaded all models (from hook):', fetchedModels.length, 'from OpenRouter API'); // Less verbose logging

        if (fetchedModels && fetchedModels.length > 0) {
          // ... existing sorting and mapping ...
          const mappedOptions: ModelOption[] = fetchedModels.map(mapOpenRouterToModelOption);
          
          mappedOptions.sort((a, b) => {
            const providerA = a.id.split('/')[0];
            const providerB = b.id.split('/')[0];
            if (providerA !== providerB) return providerA.localeCompare(providerB);
            if (a.hasVision !== b.hasVision) return a.hasVision ? -1 : 1;
            return a.name.localeCompare(b.name);
          });
          
          setAllModels(mappedOptions);

          // Auto-select model logic - only if modelName is not already set or not in the new list
          const currentModelExistsInNewList = mappedOptions.some(m => m.id === modelName);
          if (!modelName || !currentModelExistsInNewList) {
            const visionModel = mappedOptions.find(m => m.hasVision);
            if (visionModel) {
              setModelName(visionModel.id);
            } else if (mappedOptions.length > 0) {
              setModelName(mappedOptions[0].id);
            } 
            // Removed fallback to defaultVisionModels here, as setAllModels(defaultVisionModels) covers it below
          }
        } else {
          // console.log('No models returned from API (from hook), using default list'); // Less verbose logging
          setAllModels(defaultVisionModels); // Use the stable defaultVisionModels reference
          // If API fails and no model was selected, or selected model is not in defaults, pick first default
          if (!modelName || !defaultVisionModels.some(m => m.id === modelName)) {
            if (defaultVisionModels.length > 0) {
              setModelName(defaultVisionModels[0].id);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load models (from hook):', error);
        setAllModels(defaultVisionModels); // Use the stable defaultVisionModels reference
        // If API fails and no model was selected, or selected model is not in defaults, pick first default
        if (!modelName || !defaultVisionModels.some(m => m.id === modelName)) {
          if (defaultVisionModels.length > 0) {
            setModelName(defaultVisionModels[0].id);
          }
        }
      } finally {
        setIsLoadingModels(false);
      }
    } else if (!apiKey || apiKeyStatus === 'invalid') {
      // Clear models or set to default if API key is removed or becomes invalid
      // console.log('API key invalid or empty (from hook), setting default models'); // Less verbose logging
      setAllModels(defaultVisionModels); // Use the stable defaultVisionModels reference
      if (defaultVisionModels.length > 0 && (!modelName || !defaultVisionModels.some(m => m.id === modelName))) {
        setModelName(defaultVisionModels[0].id);
      } else if (defaultVisionModels.length === 0) {
        setModelName(''); // No models available
      }
    }
  }, [apiKey, apiKeyStatus, defaultVisionModels, modelName, setModelName]); // Added setModelName to dependencies

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  // Effect for when API key becomes invalid or empty - This logic is now integrated into loadModels
  // useEffect(() => {
  //   if (apiKeyStatus === 'invalid' || !apiKey) {
  //     console.log('API key invalid or empty (from hook), setting default models');
  //     setAllModels(defaultVisionModels);
  //   }
  // }, [apiKey, apiKeyStatus, defaultVisionModels]);

  return { 
    allModels, 
    setAllModels, // Expose setter if manual additions are still needed outside
    isLoadingModels, 
    modelName, 
    setModelName 
  };
};

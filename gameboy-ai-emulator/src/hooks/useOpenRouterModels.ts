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
        console.log('Fetching all models with API key (from hook)');
        const fetchedModels: OpenRouterModel[] = await getAvailableModels(apiKey);
        console.log('Loaded all models (from hook):', fetchedModels.length, 'from OpenRouter API');

        if (fetchedModels && fetchedModels.length > 0) {
          fetchedModels.sort((a, b) => {
            const providerA = a.id.split('/')[0];
            const providerB = b.id.split('/')[0];
            if (providerA !== providerB) {
              return providerA.localeCompare(providerB);
            }
            return a.name.localeCompare(b.name);
          });
          
          // Map all models and keep them in allModels
          const mappedOptions: ModelOption[] = fetchedModels.map(mapOpenRouterToModelOption);
          setAllModels(mappedOptions);

          // If no model is selected yet, select a vision model by default
          if (!modelName) {
            const visionModel = mappedOptions.find(m => m.hasVision);
            if (visionModel) {
              setModelName(visionModel.id);
            } else if (mappedOptions.length > 0) {
              // Fall back to any model if no vision models
              setModelName(mappedOptions[0].id);
            } else if (defaultVisionModels.length > 0) {
              // Fall back to default models if API returned nothing
              setModelName(defaultVisionModels[0].id);
            }
          }
        } else {
          console.log('No models returned from API (from hook), using default list');
          setAllModels(defaultVisionModels);
        }
      } catch (error) {
        console.error('Failed to load models (from hook):', error);
        setAllModels(defaultVisionModels);
      } finally {
        setIsLoadingModels(false);
      }
    }
  }, [apiKey, apiKeyStatus, defaultVisionModels, modelName]);

  useEffect(() => {
    loadModels();
  }, [loadModels]); // API Key and status changes will trigger loadModels due to its own dependencies

  // Effect for when API key becomes invalid or empty
  useEffect(() => {
    if (apiKeyStatus === 'invalid' || !apiKey) {
      console.log('API key invalid or empty (from hook), setting default models');
      setAllModels(defaultVisionModels);
    }
  }, [apiKey, apiKeyStatus, defaultVisionModels]);

  return { 
    allModels, 
    setAllModels, // Expose setter if manual additions are still needed outside
    isLoadingModels, 
    modelName, 
    setModelName 
  };
};

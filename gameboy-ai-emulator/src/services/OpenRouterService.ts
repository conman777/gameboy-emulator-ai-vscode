import axios from 'axios';
import OpenAI from 'openai';
import { GameBoyButton, OpenRouterModel } from '../types';

// OpenRouter API service for Game Boy AI control
const API_URL = 'https://openrouter.ai/api/v1';
// const SITE_URL = window.location.origin;
let SITE_URL = 'http://localhost:3000'; // Default or placeholder
if (typeof window !== 'undefined' && window.location && window.location.origin) {
  SITE_URL = window.location.origin;
}
const SITE_NAME = 'Game Boy AI Emulator';

export async function getGameAction(
  base64ImageData: string,
  modelName: string,
  apiKey: string,
  gameContext: string = ''
): Promise<{ action: GameBoyButton | 'none' | 'error'; message?: string }> {
  try {
    console.log(`Sending Game Boy image to ${modelName} for analysis${gameContext ? ' with game context' : ''}`);
    
    // Base system prompt
    let systemPrompt = 'You control a Game Boy. Analyze the screen and choose the best button to press. ';
    systemPrompt += 'The buttons are: UP (d-pad up), DOWN (d-pad down), LEFT (d-pad left), RIGHT (d-pad right), ';
    systemPrompt += 'A (primary action button), B (secondary action/cancel button), START (menu/pause), SELECT (secondary menu). ';
    
    // Add game context if provided
    if (gameContext) {
      systemPrompt += `Additional game context: ${gameContext} `;
    }
    
    systemPrompt += 'Respond with ONLY ONE of these buttons: UP, DOWN, LEFT, RIGHT, A, B, START, SELECT, or NONE if no action is needed.';
    
    const response = await axios.post(
      `${API_URL}/chat/completions`,
      {
        model: modelName,
        messages: [
          { 
            role: 'system', 
            content: systemPrompt
          },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: 'What button should I press for this Game Boy screen?' },
              { type: 'image_url', image_url: { url: `data:image/png;base64,${base64ImageData}` } }
            ]
          }
        ],
        max_tokens: 10,
        temperature: 0.3 // Lower temperature for more consistent responses
      },
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': SITE_URL,
          'X-Title': SITE_NAME
        },
        timeout: 30000 // 30 second timeout to handle potential slow responses
      }
    );
    
    const content = response.data.choices[0]?.message?.content?.trim().toUpperCase() || '';
    
    if (content.includes('UP')) return { action: 'up' };
    if (content.includes('DOWN')) return { action: 'down' };
    if (content.includes('LEFT')) return { action: 'left' };
    if (content.includes('RIGHT')) return { action: 'right' };
    if (content.includes('A')) return { action: 'a' };
    if (content.includes('B')) return { action: 'b' };
    if (content.includes('START')) return { action: 'start' };
    if (content.includes('SELECT')) return { action: 'select' };
    
    return { action: 'none' };
  } catch (error) {
    return { action: 'error', message: 'AI service error' };
  }
}

export async function getAvailableModels(apiKey: string): Promise<OpenRouterModel[]> {
  // This function will now fetch all models and then filter them by vision capability.
  // ConfigPanel will use getAllModels directly if it needs truly *all* models.
  try {
    console.log('Fetching all models and then filtering for vision-capable ones...');
    const allModels = await getAllModels(apiKey); // Re-use getAllModels
    
    const visionModels = allModels.filter(model => model.hasVision === true);
    
    console.log('Filtered vision models based on hasVision flag:', visionModels.length);
    return visionModels;

  } catch (error: any) {
    console.error('Error fetching available (vision) models:', error);
    return [];
  }
}

/**
 * Validates an OpenRouter API key by attempting to fetch models
 * @param apiKey The API key to validate
 * @returns Promise<boolean> True if the key is valid
 */
export const validateApiKey = async (apiKey: string): Promise<boolean> => {
  try {
    if (!apiKey || apiKey.trim() === '') {
      console.log('Empty API key, cannot validate');
      return false;
    }
    
    console.log('Validating OpenRouter API key...');
    
    // Log some details about the key format (safely)
    const safeKeyDisplay = apiKey.length > 8 ? 
      `${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 3)}` : 
      '(key too short)';
    console.log(`API key format: ${safeKeyDisplay}`);
    
    // Check if the key has the expected OpenRouter format (typically starts with sk-or-)
    const hasExpectedFormat = apiKey.startsWith('sk-or-');
    if (!hasExpectedFormat) {
      console.warn('API key does not have the typical OpenRouter format (should start with sk-or-)');
      // Continue with validation anyway since some older keys might have different formats
    }
    
    // First try a direct API call using axios for more detailed error info
    try {
      const testResponse = await axios.get(`${API_URL}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': SITE_URL,
          'X-Title': SITE_NAME
        }
      });
      
      if (testResponse.status === 200) {
        console.log('Direct API validation successful with status:', testResponse.status);
        return true;
      }
    } catch (axiosError: any) {
      console.warn('Direct API validation failed:', axiosError.message);
      console.warn('Status:', axiosError.response?.status);
      console.warn('Response data:', axiosError.response?.data);
      
      // If we get a 401 Unauthorized, the key is definitely invalid
      if (axiosError.response?.status === 401) {
        console.error('API key is invalid (401 Unauthorized)');
        return false;
      }
      
      // For other errors, continue to try the OpenAI client method
      console.log('Trying alternate validation method...');
    }
    
    // Create OpenAI client configured for OpenRouter (fallback method)
    const openrouterClient = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: apiKey,
      defaultHeaders: {
        'HTTP-Referer': SITE_URL,
        'X-Title': SITE_NAME
      }
    });
    
    // Try to fetch models as a validation check
    const response = await openrouterClient.models.list();
    
    if (response && response.data && Array.isArray(response.data)) {
      console.log('API key validation successful, models found:', response.data.length);
      return true;
    } else {
      console.warn('API key validation returned an unexpected response format:', response);
      // Return true anyway if we got some response without error
      return true;
    }
  } catch (error: any) {
    console.error('API key validation failed:', error.message);
    
    if (error.response) {
      console.error('Error status:', error.response.status);
      console.error('Error data:', error.response.data);
    }
    
    // Check for common error types
    if (error.message.includes('401') || error.message.includes('unauthorized') || error.message.includes('invalid_api_key')) {
      console.error('Error indicates invalid API key (401 Unauthorized)');
    } else if (error.message.includes('429')) {
      console.error('Error indicates rate limiting (429 Too Many Requests)');
    } else if (error.message.includes('timeout') || error.message.includes('network')) {
      console.error('Error indicates network or timeout issue');
    }
    
    return false;
  }
}

export async function getAllModels(apiKey: string): Promise<OpenRouterModel[]> {
  try {
    // Attempt to force recompile by adding a comment
    console.log('Fetching ALL models from OpenRouter API using OpenAI client...');
    
    // Create OpenAI client configured for OpenRouter
    const openrouterClient = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: apiKey,
      defaultHeaders: {
        'HTTP-Referer': SITE_URL,
        'X-Title': SITE_NAME
      }
    });
    
    // Fetch models using the client library
    const modelsResponse = await openrouterClient.models.list();
    const models = modelsResponse.data || [];
    
    console.log('Total models fetched from OpenRouter:', models.length);
    
    // Log sample model information for debugging
    if (models.length > 0) {
      console.log('Sample model data from API:', JSON.stringify(models[0], null, 2));
    }
    
    // Map all models, and determine vision capability for informational purposes.
    // The list itself will NOT be filtered here.
    const mappedModels = models.map((model: any) => {
      const hasVision = hasVisionCapability(model); // Keep for informational purposes
      
      return {
        id: model.id || 'unknown',
        name: model.name || model.id || 'Unknown Model',
        description: model.description || '',
        context_length: model.context_length || undefined,
        pricing: model.pricing || { prompt: '0', completion: '0', request: '0', image: '0' },
        capabilities: model.capabilities || {}, // Changed from string[] to object based on OpenRouter docs
        hasVision: hasVision, // Store the determined vision capability
        // Add any other relevant fields directly from the API model object
        architecture: model.architecture || undefined,
        top_provider: model.top_provider || undefined,
        is_moderated: model.is_moderated || false,
      };
    });
    
    console.log(`Mapped ${mappedModels.length} models without filtering.`);
    
    // Log a summary of models and their determined vision capabilities (first few)
    if (mappedModels.length > 0) {
      console.log('Sample of mapped models (first 5):');
      mappedModels.slice(0, 5).forEach(m => 
        console.log(`- ${m.id} (Name: ${m.name}, Vision: ${m.hasVision})`)
      );
    }
    
    return mappedModels;
  } catch (error: any) {
    console.error('Error fetching all models:', error);
    console.error('Error response:', error.response?.data);
    return [];
  }
}

/**
 * Helper function to check if a model has vision capabilities.
 * This is kept for informational purposes or if other parts of the app need it.
 */
function hasVisionCapability(model: any): boolean {
  // If model data directly indicates multimodal or vision capabilities
  if (model.architecture?.modality === 'multimodal' || 
      (model.capabilities && (model.capabilities.image_input || model.capabilities.vision))) {
    console.log(`Model ${model.id} has direct vision capability flag.`);
    return true;
  }

  // Check in model name and ID for vision-related terms (less reliable, but a fallback)
  const visionTerms = [
    'vision', 'image', 'visual', 'multimodal', 'sight', 'see', 'vqa', 
    'gpt-4', 'gpt4', // gpt-4 often implies vision
    'claude-3', // claude-3 often implies vision
    'gemini', // gemini often implies vision
    'llama-3', 'llama3', // some llama3 variants have vision
    'idefics', 'llava', 'fuyu', 'cogvlm', 'vila' // known vision model names/families
  ];

  const textToCheck = `${model.id?.toLowerCase()} ${model.name?.toLowerCase()} ${model.description?.toLowerCase()}`;
  
  if (visionTerms.some(term => textToCheck.includes(term))) {
    console.log(`Model ${model.id} name/id/description suggests vision capability.`);
    return true;
  }
  
  return false;
}

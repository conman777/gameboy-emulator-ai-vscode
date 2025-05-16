import axios from 'axios';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';

/**
 * Get a game action from an AI model based on a screen capture
 */
export const getGameAction = async (
  base64ImageData,
  modelName,
  apiKey
) => {
  try {
    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: modelName,
        messages: [
          {
            role: 'system',
            content: `You are an AI controlling a Game Boy. Respond with ONLY ONE button: UP, DOWN, LEFT, RIGHT, A, B, START, SELECT, or NONE.`
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'What button should I press?' },
              {
                type: 'image_url',
                image_url: { url: `data:image/png;base64,${base64ImageData}` }
              }
            ]
          }
        ],
        max_tokens: 10
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin
        }
      }
    );
    
    const content = response.data.choices[0]?.message?.content?.trim().toUpperCase() || '';
    
    // Map the response to a Game Boy button
    if (content.includes('UP')) return { action: 'up' };
    if (content.includes('DOWN')) return { action: 'down' };
    if (content.includes('LEFT')) return { action: 'left' };
    if (content.includes('RIGHT')) return { action: 'right' };
    if (content.includes('A')) return { action: 'a' };
    if (content.includes('B')) return { action: 'b' };
    if (content.includes('START')) return { action: 'start' };
    if (content.includes('SELECT')) return { action: 'select' };
    if (content.includes('NONE')) return { action: 'none' };
    
    return { action: 'none', message: `Could not parse AI response: ${content}` };
  } catch (error) {
    console.error('Error getting game action from AI:', error);
    return { action: 'error', message: 'Error communicating with AI service' };
  }
};

/**
 * Fetch available models from OpenRouter
 */
export const getAvailableModels = async (apiKey) => {
  try {
    const response = await axios.get(OPENROUTER_MODELS_URL, {
      headers: { 
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin
      }
    });
    
    const models = response.data.data || response.data || [];
    
    return models
      .filter((model) => {
        const hasVision = (model.capabilities && 
                         Array.isArray(model.capabilities) && 
                         model.capabilities.includes('vision'));
        return hasVision;
      })
      .map((model) => ({
        id: model.id || 'unknown',
        name: model.name || model.id || 'Unknown Model',
        context_length: model.context_length || 4096,
        pricing: model.pricing || { prompt: 0, completion: 0 },
        capabilities: model.capabilities || []
      }));
  } catch (error) {
    console.error('Error fetching models:', error);
    return [];
  }
};

/**
 * Validates an OpenRouter API key
 */
export const validateApiKey = async (apiKey) => {
  try {
    const response = await axios.get(OPENROUTER_MODELS_URL, {
      headers: { 
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin
      }
    });
    return response.status === 200;
  } catch (error) {
    return false;
  }
};

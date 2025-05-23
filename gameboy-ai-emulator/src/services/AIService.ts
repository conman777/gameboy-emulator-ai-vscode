/* File: AIService.ts - AI Service for Game Boy integration */
import axios from 'axios';
import { GameBoyButton, OpenRouterModel } from '../types';
import { recordAIObservation, addNavigationPoint } from './KnowledgeBaseService';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const SITE_URL = window.location.origin;
const SITE_NAME = 'Game Boy AI Emulator';

export interface OpenRouterResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

/**
 * Get a game action from an AI model based on a screen capture
 */
export const getGameAction = async (
  base64ImageData: string,
  modelName: string,
  apiKey: string,
  gameContext: string = '',
  maxTokens: number = 300,
  romTitle: string,
  feedbackText?: string[] // Added feedbackText parameter
): Promise<{ action: GameBoyButton | 'none' | 'error'; message?: string; aiThought?: string; parsedResponse?: any }> => {
  // Declare these variables outside the try block so they're accessible in the finally block
  let aiThought = '';
  let content = '';
  let parsedResponseForFinally: any = null;
  
  const currentGameTitle = romTitle; // Use the passed romTitle

  try {
    // Import the buildCompleteLLMPrompt function dynamically to avoid circular dependencies
    const { buildCompleteLLMPrompt, parseAIActionResponse } = await import('./AIGoalService');
    
    // Generate a complete prompt with system instructions, game context, active goal, and feedback
    // Assuming buildCompleteLLMPrompt now takes feedbackText as its last or an optional parameter.
    // The AIGoalService was already updated to handle this.
    // For now, we assume knowledgeBaseSummary and previousActions are handled internally or not used here.
    // TODO: Re-evaluate if knowledgeBaseSummary and previousActions need to be passed from AIController
    const systemPrompt = buildCompleteLLMPrompt(gameContext, '' /* knowledgeBaseSummary */, [] /* previousActions */, feedbackText);

    const response = await axios.post(
      OPENROUTER_API_URL,      
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
              { type: 'text', text: 'What button should I press based on this Game Boy screen?' },
              {
                type: 'image_url',
                image_url: { url: `data:image/png;base64,${base64ImageData}` }
              }
            ]
          }
        ],
        max_tokens: maxTokens // Use the passed maxTokens
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': SITE_NAME
        }
      }
    );
    
    content = response.data.choices[0]?.message?.content?.trim() || '';
    
    const parsedResponse = parseAIActionResponse(content);
    parsedResponseForFinally = parsedResponse; // Store for finally block
    
    const action = parsedResponse.action;
    aiThought = parsedResponse.reasoning; // Corrected to use reasoning from AIActionResponse
    
    console.log('AI response:', content);
    console.log('AI thought:', aiThought);
    console.log('Parsed action:', action);
    
    return { action, message: content, aiThought, parsedResponse };
  } catch (error: any) {
    console.error('Error getting game action from AI:', error);
    return { 
      action: 'error', 
      message: `Error communicating with AI service: ${error.message || 'Unknown error'}`,
      aiThought: 'Error processing request'
    };
  } finally {
    // Add the AI's thought to the knowledge base if it's valid
    if (aiThought && aiThought.length > 0 && aiThought !== 'Error processing request') {
      try {
        let recordedAction: GameBoyButton | 'none' | undefined = undefined;
        
        if (parsedResponseForFinally && parsedResponseForFinally.action && parsedResponseForFinally.action !== 'error') {
            recordedAction = parsedResponseForFinally.action;
        }

        recordAIObservation(aiThought, currentGameTitle, recordedAction, base64ImageData);
      } catch (e) {
        console.error('Error recording AI observation:', e);
      }
    }
  }
};

/**
 * Fetch available models from OpenRouter
 */
export const getAvailableModels = async (apiKey: string): Promise<OpenRouterModel[]> => {
  try {
    const response = await axios.get(OPENROUTER_MODELS_URL, {
      headers: { 
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': SITE_NAME
      }
    });
    
    const models = response.data.data || response.data || [];
    
    // Return ALL models, not just vision ones
    return models.map((model: any) => ({
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
export const validateApiKey = async (apiKey: string): Promise<boolean> => {
  try {
    const response = await axios.get(OPENROUTER_MODELS_URL, {
      headers: { 
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': SITE_NAME
      }
    });
    return response.status === 200;
  } catch (error) {
    console.error('API key validation error:', error);
    return false;
  }
};

/**
 * Send a custom prompt to the AI and get a response
 */
export const sendCustomPrompt = async (
  base64ImageData: string,
  modelName: string,
  apiKey: string,
  customPrompt: string,
  gameContext: string = '',
  feedbackText?: string[] 
): Promise<{ message: string; aiThought: string }> => {
  try {
    // Removed import of buildCompleteLLMPrompt as we are creating a custom system prompt here
    // const { buildCompleteLLMPrompt } = await import('./AIGoalService');
    
    const systemMessageForCustomPrompt = `You are an AI assistant observing a Game Boy game. The user has a question, instruction, or feedback for you regarding the current game state.
Game being played: ${gameContext || 'Unknown Game'}.
Please analyze their message in conjunction with the provided game screen image and respond directly, clearly, and thoughtfully to the user's input.
${feedbackText && feedbackText.length > 0 ? `\nConsider the following recent feedback/instructions as well:\n${feedbackText.join('\n')}` : ''}
Focus on addressing the user's message.`;

    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: modelName,
        messages: [
          {
            role: 'system',
            content: systemMessageForCustomPrompt 
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: customPrompt }, // User's custom query
              {
                type: 'image_url',
                image_url: { url: `data:image/png;base64,${base64ImageData}` }
              }
            ]
          }
        ],
        max_tokens: 500 // Or make this configurable
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': SITE_URL,
          'X-Title': SITE_NAME
        }
      }
    );

    const aiThought = response.data.choices[0]?.message?.content?.trim() || '';
    return { message: aiThought, aiThought };

  } catch (error: any) {
    console.error('Error sending custom prompt to AI:', error);
    return { 
      message: `Error communicating with AI service: ${error.message || 'Unknown error'}`,
      aiThought: 'Error processing custom prompt'
    };
  }
};

/**
 * Ask the AI to analyze the game screen and identify the player's position on the grid
 */
export const analyzePlayerPosition = async (
  base64ImageData: string,
  modelName: string,
  apiKey: string,
  gridWidth: number = 16,
  gridHeight: number = 16
): Promise<{ x: number, y: number, confidence: number }> => {
  try {
    // Create a grid-specific system prompt
    const systemPrompt = `You are a computer vision system analyzing a Game Boy screen. 
    The screen is divided into a ${gridWidth}x${gridHeight} grid. 
    Identify the player character's position on this grid.
    Respond with ONLY a JSON object containing x (0-${gridWidth-1}), y (0-${gridHeight-1}) coordinates, and a confidence score (0-1).
    Example: {"x": 8, "y": 7, "confidence": 0.9}`;
    
    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: [
              { 
                type: 'text', 
                text: `Where is the player character on the ${gridWidth}x${gridHeight} grid? Respond with ONLY a JSON object.` 
              },
              { 
                type: 'image_url', 
                image_url: { 
                  url: `data:image/png;base64,${base64ImageData}` 
                } 
              }
            ]
          }
        ],
        response_format: { type: "json_object" }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': SITE_NAME
        }
      }
    );
    
    const aiResponse = response.data.choices[0]?.message?.content || "{}";
    
    try {
      // Parse the JSON response
      const parsed = JSON.parse(aiResponse);
      return {
        x: parseInt(parsed.x, 10) || 0,
        y: parseInt(parsed.y, 10) || 0,
        confidence: parseFloat(parsed.confidence) || 0.5
      };
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      // Default to center of screen with low confidence
      return {
        x: Math.floor(gridWidth / 2),
        y: Math.floor(gridHeight / 2),
        confidence: 0.1
      };
    }
  } catch (error) {
    console.error("Error analyzing player position:", error);
    throw error;
  }
};

/**
 * Ask the AI to describe what's at a particular grid location
 */
export const analyzeGridLocation = async (
  base64ImageData: string,
  gridX: number,
  gridY: number,
  modelName: string,
  apiKey: string
): Promise<string> => {
  try {
    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: modelName,
        messages: [
          { 
            role: 'system', 
            content: `You are analyzing a Game Boy screen. The screen is divided into a 16x16 grid. 
            Describe what is at the specific grid coordinates precisely and concisely.` 
          },
          { 
            role: 'user', 
            content: [
              { 
                type: 'text', 
                text: `What is located at grid coordinates (${gridX}, ${gridY})? Be very brief.` 
              },
              { 
                type: 'image_url', 
                image_url: { 
                  url: `data:image/png;base64,${base64ImageData}` 
                } 
              }
            ]
          }
        ],
        max_tokens: 50
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': SITE_NAME
        }
      }
    );
    
    return response.data.choices[0]?.message?.content?.trim() || "Unknown";
  } catch (error) {
    console.error("Error analyzing grid location:", error);
    throw error;
  }
};

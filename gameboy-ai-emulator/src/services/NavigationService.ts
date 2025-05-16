// NavigationService.ts - Service to help the AI with game navigation
import { GameBoyButton } from '../types';
import { sendCustomPrompt } from './AIService';
import { addNavigationPoint } from './KnowledgeBaseService';

/**
 * Creates a navigation path between two locations
 */
export const createNavigationPath = async (
  base64ImageData: string,
  modelName: string,
  apiKey: string,
  fromLocation: string,
  toLocation: string,
  gameTitle: string, // Added gameTitle parameter
  gameContext: string = ''
): Promise<{ success: boolean; message: string; navigationPoint?: any }> => {
  try {
    // Craft a specific prompt to ask the AI for navigation instructions
    const prompt = `I'm in the location "${fromLocation}" and need to get to "${toLocation}". 
    Based on the current game screen, can you provide navigation directions? 
    Please describe the path using game buttons (UP, DOWN, LEFT, RIGHT, A, B) in the correct sequence.`;
    
    // Send the prompt to the AI
    const response = await sendCustomPrompt(
      base64ImageData,
      modelName,
      apiKey,
      prompt,
      gameContext
    );
    
    // Extract directions from the AI's response
    const directions: GameBoyButton[] = [];
    const content = response.aiThought.toUpperCase();
    
    // Simple parsing - just look for button names in the response
    if (content.includes('UP')) directions.push('up');
    if (content.includes('DOWN')) directions.push('down');
    if (content.includes('LEFT')) directions.push('left');
    if (content.includes('RIGHT')) directions.push('right');
    if (content.includes(' A ') || content.includes('PRESS A')) directions.push('a');
    if (content.includes(' B ') || content.includes('PRESS B')) directions.push('b');
    if (content.includes('START')) directions.push('start');
    if (content.includes('SELECT')) directions.push('select');
    
    // Only create a navigation point if we have directions
    if (directions.length > 0) {
      // Create a name for the path
      const pathName = `${fromLocation} to ${toLocation}`;
      
      // Create the navigation point object
      const navigationPointData = {
        name: pathName,
        description: response.aiThought, // Using AI thought as description
        gameTitle, // Pass the gameTitle
        fromLocation,
        toLocation,
        directions,
        tags: ['ai-generated']
        // screenshot is no longer part of NavigationPoint
      };
      
      const navigationPoint = addNavigationPoint(navigationPointData);
      
      return { 
        success: true, 
        message: `Created navigation path from ${fromLocation} to ${toLocation}`,
        navigationPoint
      };
    }
    
    return { 
      success: false, 
      message: 'Could not determine navigation directions from AI response.'
    };
  } catch (error: any) {
    console.error('Error creating navigation path:', error);
    return { 
      success: false, 
      message: `Error: ${error.message || 'Unknown error creating navigation path'}`
    };
  }
};

/**
 * Executes a sequence of navigation actions
 * Returns a generator that yields progress information
 */
export function* executeNavigationSequence(
  emulator: any, 
  directions: GameBoyButton[],
  delayMs: number = 500
): Generator<{
  stepNumber: number;
  totalSteps: number;
  button: GameBoyButton;
}, void, unknown> {  if (!emulator || !directions.length) return;
  
  for (let i = 0; i < directions.length; i++) {
    const button = directions[i];
    
    // Press the button
    if (typeof emulator.pressButton === 'function') {
      emulator.pressButton(button);
      
      // Yield progress information
      yield {
        stepNumber: i + 1,
        totalSteps: directions.length,
        button
      };
      
      // After yielding, the caller is responsible for waiting 
      // and then resuming the generator for the next step
      
      // Release the button - this happens on the next iteration
      // when the generator is resumed
      emulator.releaseButton(button);
    }
  }
}

export default {
  createNavigationPath,
  executeNavigationSequence
};

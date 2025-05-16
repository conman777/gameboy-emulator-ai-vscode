// AIGoalService.ts - Service for managing AI goals and system prompts
import { 
  AIGoal, 
  AISystemPrompt, 
  AIActionResponse, 
  AIButtonSequence 
} from '../types/index'; // Corrected import path from ../types to ../types/index
import { GameBoyButton } from '../types/index'; // Ensure GameBoyButton is also imported if needed directly, or ensure it's covered by AIActionResponse

// Default system prompts
const DEFAULT_SYSTEM_PROMPTS: AISystemPrompt[] = [
  {
    id: 'default-general',
    name: 'General Game Playing',
    description: 'Default prompt for general gameplay without specific objectives',
    content: `You are an AI controlling a Game Boy game. Analyze the screen and choose the best action.
    
Game Boy Controls:
- UP: D-pad up (move up, navigate menus up)
- DOWN: D-pad down (move down, navigate menus down)
- LEFT: D-pad left (move left)
- RIGHT: D-pad right (move right)
- A: Primary action button (confirm, jump, attack)
- B: Secondary action/cancel button (back, special move, run)
- START: Pause/menu button (start game, pause)
- SELECT: Secondary menu button (change options)
- NONE: No action needed at this moment

First EXPLAIN your reasoning in one or two sentences including what you observe on screen and any important game state information. Then on a new line respond with ONLY ONE button: UP, DOWN, LEFT, RIGHT, A, B, START, SELECT, or NONE.

Keep track of where you are in the game, write down important locations and how to navigate between them. If you recognize a location, describe where you are and how it connects to other locations.`,
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'json-structured',
    name: 'JSON Structured Response',
    description: 'Prompt that instructs the AI to return a structured JSON response with reasoning and action',
    content: `You are an AI controlling a Game Boy game. Analyze the screen and choose the best action.
    
Game Boy Controls:
- UP: D-pad up (move up, navigate menus up)
- DOWN: D-pad down (move down, navigate menus down)
- LEFT: D-pad left (move left)
- RIGHT: D-pad right (move right)
- A: Primary action button (confirm, jump, attack)
- B: Secondary action/cancel button (back, special move, run)
- START: Pause/menu button (start game, pause)
- SELECT: Secondary menu button (change options)
- NONE: No action needed at this moment

Analyze the game screen and respond with a JSON object in the following format:
{
  "reasoning": "Your analysis of the current situation",
  "action": "One of: UP, DOWN, LEFT, RIGHT, A, B, START, SELECT, NONE",
  "goalProgress": "Optional comment on progress toward the current goal"
}

Keep your reasoning concise but informative. Be aware of your current location and the game's state. Develop mental maps of the environments you encounter.`,
    isDefault: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'exploration',
    name: 'Exploration Mode',
    description: 'Prompt focused on systematic exploration of game environments',
    content: `You are an AI controlling a Game Boy game with the primary objective of exploring and mapping the game world.
    
Game Boy Controls:
- UP: D-pad up (move up, navigate menus up)
- DOWN: D-pad down (move down, navigate menus down)
- LEFT: D-pad left (move left)
- RIGHT: D-pad right (move right)
- A: Primary action button (confirm, jump, attack)
- B: Secondary action/cancel button (back, special move, run)
- START: Pause/menu button (start game, pause)
- SELECT: Secondary menu button (change options)
- NONE: No action needed at this moment

Your goal is to systematically explore and map the game world. As you explore:
1. Keep track of where you are and how areas connect
2. Try to identify key locations and their purposes
3. Discover interactive elements and items
4. Record any obstacles that may require specific abilities to overcome

First EXPLAIN what you observe on screen, your current location, and your exploration strategy. Then on a new line respond with ONLY ONE button: UP, DOWN, LEFT, RIGHT, A, B, START, SELECT, or NONE.`,
    isDefault: false,
    createdAt: new Date().toISOString(),
  }
];

// In-memory storage
let goals: AIGoal[] = [];
let systemPrompts: AISystemPrompt[] = [...DEFAULT_SYSTEM_PROMPTS];
let activeSystemPromptId: string = 'default-general';
let activeGoalId: string | null = null;

// Initialize from localStorage
try {
  const storedPrompts = localStorage.getItem('ai_system_prompts');
  if (storedPrompts) {
    const parsedPrompts = JSON.parse(storedPrompts);
    // Keep default prompts and add user-created ones
    systemPrompts = [
      ...DEFAULT_SYSTEM_PROMPTS,
      ...parsedPrompts.filter((prompt: AISystemPrompt) => 
        !DEFAULT_SYSTEM_PROMPTS.some(defaultPrompt => defaultPrompt.id === prompt.id)
      )
    ];
  }
  
  const storedGoals = localStorage.getItem('ai_goals');
  if (storedGoals) {
    goals = JSON.parse(storedGoals);
  }
  
  const storedActivePromptId = localStorage.getItem('ai_active_system_prompt_id');
  if (storedActivePromptId) {
    activeSystemPromptId = storedActivePromptId;
  }
  
  const storedActiveGoalId = localStorage.getItem('ai_active_goal_id');
  if (storedActiveGoalId) {
    activeGoalId = storedActiveGoalId;
  }
} catch (error) {
  console.error('Error loading AI goals and prompts:', error);
}

// Helper to save state to localStorage
const saveState = () => {
  try {
    localStorage.setItem('ai_system_prompts', JSON.stringify(systemPrompts));
    localStorage.setItem('ai_goals', JSON.stringify(goals));
    localStorage.setItem('ai_active_system_prompt_id', activeSystemPromptId);
    localStorage.setItem('ai_active_goal_id', activeGoalId !== null ? activeGoalId : '');
  } catch (error) {
    console.error('Error saving AI goals and prompts:', error);
  }
};

// System Prompt Management
export const getAllSystemPrompts = (): AISystemPrompt[] => {
  return systemPrompts;
};

export const getSystemPromptById = (id: string): AISystemPrompt | undefined => {
  return systemPrompts.find(prompt => prompt.id === id);
};

export const getActiveSystemPrompt = (): AISystemPrompt => {
  const activePrompt = systemPrompts.find(prompt => prompt.id === activeSystemPromptId);
  return activePrompt || systemPrompts.find(prompt => prompt.isDefault) || systemPrompts[0];
};

export const setActiveSystemPrompt = (id: string): boolean => {
  if (systemPrompts.some(prompt => prompt.id === id)) {
    activeSystemPromptId = id;
    saveState();
    return true;
  }
  return false;
};

export const addSystemPrompt = (prompt: Omit<AISystemPrompt, 'id' | 'createdAt'>): AISystemPrompt => {
  const newPrompt: AISystemPrompt = {
    ...prompt,
    id: `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  };
  
  systemPrompts.push(newPrompt);
  saveState();
  return newPrompt;
};

export const updateSystemPrompt = (
  id: string, 
  updates: Partial<Omit<AISystemPrompt, 'id' | 'createdAt'>>
): AISystemPrompt | null => {
  const index = systemPrompts.findIndex(prompt => prompt.id === id);
  
  // Don't allow modification of default prompts
  const promptToUpdate = systemPrompts[index];
  if (index === -1 || promptToUpdate.isDefault) {
    return null;
  }
  
  const updatedPrompt = {
    ...promptToUpdate,
    ...updates,
  };
  
  systemPrompts[index] = updatedPrompt;
  saveState();
  return updatedPrompt;
};

export const deleteSystemPrompt = (id: string): boolean => {
  // Don't allow deletion of default prompts
  const promptToDelete = systemPrompts.find(prompt => prompt.id === id);
  if (!promptToDelete || promptToDelete.isDefault) {
    return false;
  }
  
  // If deleting the active prompt, switch to default
  if (activeSystemPromptId === id) {
    const defaultPrompt = systemPrompts.find(prompt => prompt.isDefault);
    if (defaultPrompt) {
      activeSystemPromptId = defaultPrompt.id;
    }
  }
  
  systemPrompts = systemPrompts.filter(prompt => prompt.id !== id);
  saveState();
  return true;
};

// Goal Management
export const getAllGoals = (): AIGoal[] => {
  return goals;
};

export const getActiveGoal = (): AIGoal | null => {
  if (!activeGoalId) return null;
  return goals.find(goal => goal.id === activeGoalId) || null;
};

export const setActiveGoal = (id: string | null): boolean => {
  if (id === null) {
    activeGoalId = null;
    saveState();
    return true;
  }
  
  if (goals.some(goal => goal.id === id)) {
    activeGoalId = id;
    saveState();
    return true;
  }
  return false;
};

export const addGoal = (goal: Omit<AIGoal, 'id' | 'createdAt' | 'status'>): AIGoal => {
  const newGoal: AIGoal = {
    ...goal,
    id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  
  goals.push(newGoal);
  saveState();
  return newGoal;
};

export const updateGoalStatus = (id: string, status: AIGoal['status']): AIGoal | null => {
  const index = goals.findIndex(goal => goal.id === id);
  if (index === -1) {
    return null;
  }
  
  const updatedGoal = {
    ...goals[index],
    status,
    ...(status === 'completed' ? { completedAt: new Date().toISOString() } : {}),
  };
  
  goals[index] = updatedGoal;
  saveState();
  return updatedGoal;
};

export const deleteGoal = (id: string): boolean => {
  if (activeGoalId === id) {
    activeGoalId = null;
  }
  
  const initialLength = goals.length;
  goals = goals.filter(goal => goal.id !== id);
  
  if (goals.length !== initialLength) {
    saveState();
    return true;
  }
  return false;
};

// Prompt Construction and Action Parsing
export const buildCompleteLLMPrompt = (
  gameContext: string,
  knowledgeBaseSummary: string,
  previousActions: { action: GameBoyButton | 'none'; reasoning: string }[],
  feedbackText?: string[] // Added feedbackText parameter
): string => {
  const activePrompt = getActiveSystemPrompt();
  const activeGoal = getActiveGoal();

  let prompt = activePrompt.content;

  if (feedbackText && feedbackText.length > 0) {
    // Ensure there's a space or newline before prepending feedback if prompt isn't empty
    const prefix = prompt.length > 0 ? '\n\n' : ''; 
    prompt = `RECENT FEEDBACK:${prefix}${feedbackText.join('\n  - ')}\n\n${prompt}`;
  }

  if (activeGoal) {
    prompt += `\n\nCurrent Goal: ${activeGoal.description}`;
    if (activeGoal.additionalContext) {
      prompt += `\nGoal Context: ${activeGoal.additionalContext}`;
    }
  }

  prompt += `\n\nGame Context:\n${gameContext}`;

  if (knowledgeBaseSummary) {
    prompt += `\n\nRelevant Knowledge:\n${knowledgeBaseSummary}`;
  }

  if (previousActions.length > 0) {
    prompt += `\n\nPrevious Actions (Max 5):\n`;
    const recentActions = previousActions.slice(-5); // Get last 5 actions
    recentActions.forEach((pa, index) => {
      prompt += `${index + 1}. Action: ${pa.action}, Reasoning: ${pa.reasoning}\n`;
    });
  }

  return prompt;
};

export const parseAIActionResponse = (response: string): AIActionResponse => {
  // First, try to parse as JSON if it seems to be a JSON response
  if (response.trim().startsWith('{') && response.trim().endsWith('}')) {
    try {
      const jsonResponse = JSON.parse(response.trim());
      
      // Extract action from JSON
      let action: GameBoyButton | 'none' | 'error' = 'error';
      if (jsonResponse.action) {
        const actionString = jsonResponse.action.toString().toLowerCase();
        if (actionString === 'up') action = 'up';
        else if (actionString === 'down') action = 'down';
        else if (actionString === 'left') action = 'left';
        else if (actionString === 'right') action = 'right';
        else if (actionString === 'a') action = 'a';
        else if (actionString === 'b') action = 'b';
        else if (actionString === 'start') action = 'start';
        else if (actionString === 'select') action = 'select';
        else if (actionString === 'none') action = 'none';
      }
      
      // Combine reasoning and goal progress for the thought
      let reasoning = jsonResponse.reasoning || 'No reasoning provided';
      if (jsonResponse.goalProgress) {
        reasoning += ` | Goal progress: ${jsonResponse.goalProgress}`;
      }
      
      return { action, reasoning }; // Changed aiThought to reasoning
    } catch (e) {
      console.warn('Failed to parse JSON response, falling back to text parsing', e);
      // Continue to text parsing if JSON parsing fails
    }
  }
  
  // If not JSON or JSON parsing failed, use the text-based format parsing
  // Extract the AI's thought process and the button choice
  const lines = response.split('\n').filter((line: string) => line.trim().length > 0);
  let reasoning = ''; // Changed aiThought to reasoning
  let buttonLine = response.toUpperCase(); // Default to the full content
  
  // If there are multiple lines, assume the first is the explanation and the last contains the button
  if (lines.length > 1) {
    reasoning = lines.slice(0, -1).join(' '); // Everything except the last line. Changed aiThought to reasoning
    buttonLine = lines[lines.length - 1].toUpperCase(); // Last line should contain the button
  }
  
  // Map the response to a Game Boy button
  let action: GameBoyButton | 'none' | 'error' = 'error';
  if (buttonLine.includes('UP')) action = 'up';
  else if (buttonLine.includes('DOWN')) action = 'down';
  else if (buttonLine.includes('LEFT')) action = 'left';
  else if (buttonLine.includes('RIGHT')) action = 'right';
  else if (buttonLine.includes('A')) action = 'a';
  else if (buttonLine.includes('B')) action = 'b';
  else if (buttonLine.includes('START')) action = 'start';
  else if (buttonLine.includes('SELECT')) action = 'select';
  else if (buttonLine.includes('NONE')) action = 'none';
  
  return { action, reasoning }; // Changed aiThought to reasoning
};

// Action Execution
const defaultButtonPressDuration = 100; // ms

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const executeAction = async (
  response: AIActionResponse, 
  emulator: any, // Consider EmulatorWrapperApi type
  options?: { defaultDuration?: number } // Simplified options for now
) => {
  const pressDuration = options?.defaultDuration || defaultButtonPressDuration;

  if (response.action === 'error') {
    console.warn("Skipping action execution due to 'error' action in response:", response.reasoning);
    return;
  }

  if (response.sequence && response.sequence.length > 0) {
    console.log('Executing button sequence:', response.sequence);
    for (const seqItem of response.sequence) {
      await executeSingleButtonAction(seqItem.button, emulator, seqItem.action, seqItem.duration || pressDuration);
    }
  } else if (response.action && response.action !== 'none') {
    console.log(`Executing single action: ${response.action}`);
    // No need to cast response.action here as it's already narrowed by the 'error' check
    await executeSingleButtonAction(response.action, emulator, 'press', response.duration || pressDuration);
  }
};

// Helper for single button action, supporting press, hold, release
const executeSingleButtonAction = async (
  button: GameBoyButton | 'none', 
  emulator: any, // Consider EmulatorWrapperApi type
  actionType: 'press' | 'hold' | 'release',
  duration: number
) => {
  if (button === 'none') return; // Correctly handle 'none' if it somehow gets here

  switch (actionType) {
    case 'press':
      emulator.pressButton(button);
      await sleep(duration);
      emulator.releaseButton(button);
      break;
    case 'hold':
      emulator.pressButton(button);
      // For a true hold, the release would be managed by a subsequent 'release' action
      // or a default release after a longer duration if not explicitly released.
      // This example implies hold is just a longer press for now.
      await sleep(duration); 
      // emulator.releaseButton(button); // Or manage release separately
      break;
    case 'release':
      emulator.releaseButton(button);
      break;
  }
};

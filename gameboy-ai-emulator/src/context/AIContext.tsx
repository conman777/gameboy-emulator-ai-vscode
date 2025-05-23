// AIContext.tsx - Context for AI control and prompt handling
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useEmulator } from './EmulatorContext';
import { getGameAction, sendCustomPrompt as sendCustomPromptService } from '../services/AIService';
import { GameBoyButton, AIConfig as AIConfigType } from '../types'; // Import AIConfigType
import { EmulatorWrapperApi } from '../emulator/EmulatorWrapper'; // Import EmulatorWrapperApi

export type AIStatus = 'Inactive' | 'Active' | 'Error'; // Export AIStatus
export type { AIConfigType as AIConfig }; // Export AIConfigType as AIConfig

interface AIContextType {
  aiStatus: AIStatus;
  aiThought: string | null;
  lastAction: GameBoyButton | 'none' | null;
  lastTenActions: (GameBoyButton | 'none')[]; // Add lastTenActions
  aiConfig: AIConfigType; // Use AIConfigType
  maxTokensForAI: number; // Add maxTokensForAI
  isEnabled: boolean;
  setIsEnabled: (enabled: boolean) => void;
  setAiConfig: React.Dispatch<React.SetStateAction<AIConfigType>>; // Update type to allow functional updates
  setMaxTokensForAI: (tokens: number) => void; // Add setter for maxTokensForAI
  sendCustomPrompt: (prompt: string, currentRomTitle: string | null) => Promise<void>; // Add currentRomTitle
  addLastAction: (action: GameBoyButton | 'none') => void; // Add function to add actions
  setAiThought: (thought: string | null) => void; // Expose setAiThought
}

// Create context with default values
const AIContext = createContext<AIContextType>({
  aiStatus: 'Inactive',
  aiThought: null,
  lastAction: null,
  lastTenActions: [],
  aiConfig: { apiKey: '', modelName: '', captureInterval: 2000, isActive: false, gameContext: '' },
  maxTokensForAI: 300,
  isEnabled: false,
  setIsEnabled: () => {},
  setAiConfig: () => {}, // This will be properly typed by React.Dispatch
  setMaxTokensForAI: () => {},
  sendCustomPrompt: async () => {},
  addLastAction: () => {},
  setAiThought: () => {},
});

export const useAI = () => useContext(AIContext);

interface AIProviderProps {
  children: React.ReactNode;
  currentRomTitle: string | null; // Pass romTitle from App.tsx
}

export const AIProvider: React.FC<AIProviderProps> = ({ children, currentRomTitle }) => {
  const emulator = useEmulator();
  
  // State
  const [aiStatus, setAiStatus] = useState<AIStatus>('Inactive');
  const [isEnabled, setIsEnabled] = useState(false);
  const [aiThought, setAiThoughtState] = useState<string | null>(null); // Renamed to avoid conflict
  const [lastAction, setLastAction] = useState<GameBoyButton | 'none' | null>(null);
  const [lastTenActions, setLastTenActions] = useState<(GameBoyButton | 'none')[]>([]);
  const [aiConfig, setAiConfigState] = useState<AIConfigType>({
    apiKey: '',
    modelName: '',
    captureInterval: 2000,
    isActive: false,
    gameContext: ''
  });
  const [maxTokensForAI, setMaxTokensForAIState] = useState(300);
  
  // References
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);

  // Expose setAiThought
  const setAiThought = useCallback((thought: string | null) => {
    setAiThoughtState(thought);
  }, []);
  
  // Set AI configuration
  const setAiConfig = useCallback((configOrFn: React.SetStateAction<AIConfigType>) => {
    setAiConfigState(configOrFn);
  }, []);

  // Set maxTokensForAI
  const setMaxTokensForAI = useCallback((tokens: number) => {
    setMaxTokensForAIState(tokens);
  }, []);

  // Add last action to the list
  const addLastAction = useCallback((action: GameBoyButton | 'none') => {
    setLastTenActions(prev => {
      const newActions = [...prev];
      newActions.push(action);
      return newActions.slice(-10); // Keep only the last 10 actions
    });
  }, []);
  
  // AI cycle function
  const runAICycle = useCallback(async () => {
    if (!emulator || isProcessingRef.current || !isEnabled || !aiConfig.apiKey || !aiConfig.modelName) {
      return;
    }

    const isRunning = emulator.isRunning();
    if (!isRunning) {
      return;
    }

    isProcessingRef.current = true;

    try {
      // Get screenshot
      let imageData: string | null = null;
      
      // Ensure emulator.captureScreenshot and emulator.getScreenDataAsBase64 are correctly typed
      const typedEmulator = emulator as EmulatorWrapperApi;

      if (typeof typedEmulator.captureScreenshot === 'function') {
        imageData = typedEmulator.captureScreenshot();
      }
      
      if (!imageData) {
        imageData = await typedEmulator.getScreenDataAsBase64();
      }
      
      if (!imageData) {
        console.warn('AI: Failed to capture screen data.');
        setAiStatus('Error');
        isProcessingRef.current = false;
        return;
      }
      
      // Get AI action
      const result = await getGameAction(
        imageData, 
        aiConfig.modelName, 
        aiConfig.apiKey, 
        aiConfig.gameContext, 
        maxTokensForAI,
        currentRomTitle || "" // Pass currentRomTitle
      );
      
      if (result.action === 'error') {
        console.error('AI: Error from AI service:', result.message);
        setAiStatus('Error');
      } else {
        // Set thought and action
        setAiThoughtState(result.aiThought || null);
        setLastAction(result.action);
        
        if (result.action !== 'none') {
          addLastAction(result.action); // Add action to history
          // Press the button
          typedEmulator.pressButton(result.action);
          setTimeout(() => {
            typedEmulator.releaseButton(result.action as GameBoyButton);
          }, 100);
        }
        
        setAiStatus('Active');
      }
    } catch (error: any) {
      console.error('AI: Unexpected error:', error);
      setAiStatus('Error');
    } finally {
      isProcessingRef.current = false;
    }
  }, [emulator, isEnabled, aiConfig, maxTokensForAI, currentRomTitle, addLastAction]);
  
  // Custom prompt handling
  const sendCustomPrompt = useCallback(async (prompt: string, currentRomTitle: string | null) => {
    if (!emulator || !isEnabled || !aiConfig.apiKey || !aiConfig.modelName) {
      console.warn('AI: Cannot send prompt - AI not active or missing configuration.');
      return;
    }

    try {
      // Get screenshot
      let imageData: string | null = null;
      const typedEmulator = emulator as EmulatorWrapperApi;
      
      if (typeof typedEmulator.captureScreenshot === 'function') {
        imageData = typedEmulator.captureScreenshot();
      }
      
      if (!imageData) {
        imageData = await typedEmulator.getScreenDataAsBase64();
      }
      
      if (!imageData) {
        console.warn('AI: Failed to capture screen data.');
        return;
      }
      
      // Send prompt to AI using the aliased service function
      const result = await sendCustomPromptService(
        imageData, 
        aiConfig.modelName, 
        aiConfig.apiKey, 
        prompt, 
        aiConfig.gameContext,
        [currentRomTitle || ""] // Ensure this is an array of strings
      );
      setAiThoughtState(result.aiThought);
      setLastAction(null);
      
    } catch (error: any) {
      console.error('AI: Error processing custom prompt:', error);
    }
  }, [emulator, isEnabled, aiConfig, setAiThoughtState]);
  
  // Start/stop AI interval based on state
  useEffect(() => {
    if (isEnabled && emulator?.isRunning()) {
      if (!aiConfig.apiKey || !aiConfig.modelName) {
        console.warn('AI: Cannot start - API Key or Model Name missing.');
        setAiStatus('Error');
        return;
      }
      
      if (intervalRef.current === null) {
        console.log('Starting AI control interval...');
        setAiStatus('Active');
        
        // Run immediately first time
        runAICycle();
        intervalRef.current = setInterval(runAICycle, aiConfig.captureInterval);
      }
    } else {
      if (intervalRef.current !== null) {
        console.log('Stopping AI control interval...');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        isProcessingRef.current = false;
        
        // Only set to Inactive if it wasn't stopped due to an error
        if (isEnabled) {
          setAiStatus('Inactive');
        }
      }
    }

    return () => {
      if (intervalRef.current !== null) {
        console.log('Clearing AI interval on cleanup...');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        isProcessingRef.current = false;
      }
    };
  }, [isEnabled, emulator, runAICycle, aiConfig]);
  
  // Provide context value
  const contextValue: AIContextType = {
    aiStatus,
    aiThought: aiThought, // Corrected: use aiThought state variable
    lastAction,
    lastTenActions,
    aiConfig,
    maxTokensForAI,
    isEnabled,
    setIsEnabled,
    setAiConfig,
    setMaxTokensForAI,
    sendCustomPrompt,
    addLastAction,
    setAiThought,
  };

  return (
    <AIContext.Provider value={contextValue}>
      {children}
    </AIContext.Provider>
  );
};

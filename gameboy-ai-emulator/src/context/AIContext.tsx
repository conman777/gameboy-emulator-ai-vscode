// AIContext.tsx - Context for AI control and prompt handling
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useEmulator } from './EmulatorContext';
import { getGameAction, sendCustomPrompt as sendCustomPromptService } from '../services/AIService'; // Aliased import
import { GameBoyButton } from '../types';

type AIStatus = 'Inactive' | 'Active' | 'Error';

interface AIContextType {
  aiStatus: AIStatus;
  aiThought: string | null;
  lastAction: GameBoyButton | 'none' | null;
  isEnabled: boolean;
  setIsEnabled: (enabled: boolean) => void;
  setApiConfig: (config: {
    apiKey: string;
    modelName: string;
    captureInterval: number;
    gameContext: string;
  }) => void;
  sendCustomPrompt: (prompt: string) => Promise<void>;
}

// Create context with default values
const AIContext = createContext<AIContextType>({
  aiStatus: 'Inactive',
  aiThought: null,
  lastAction: null,
  isEnabled: false,
  setIsEnabled: () => {},
  setApiConfig: () => {},
  sendCustomPrompt: async () => {},
});

export const useAI = () => useContext(AIContext);

interface AIProviderProps {
  children: React.ReactNode;
}

export const AIProvider: React.FC<AIProviderProps> = ({ children }) => {
  const emulator = useEmulator();
  
  // State
  const [aiStatus, setAiStatus] = useState<AIStatus>('Inactive');
  const [isEnabled, setIsEnabled] = useState(false);
  const [aiThought, setAiThought] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<GameBoyButton | 'none' | null>(null);
  
  // Config
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('');
  const [captureInterval, setCaptureInterval] = useState(2000);
  const [gameContext, setGameContext] = useState('');
  
  // References
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = React.useRef(false);
  
  // Set API configuration
  const setApiConfig = (config: {
    apiKey: string;
    modelName: string;
    captureInterval: number;
    gameContext: string;
  }) => {
    setApiKey(config.apiKey);
    setModelName(config.modelName);
    setCaptureInterval(config.captureInterval);
    setGameContext(config.gameContext);
  };
  
  // AI cycle function
  const runAICycle = React.useCallback(async () => {
    if (!emulator || isProcessingRef.current || !isEnabled) {
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
      
      if (typeof (emulator as any).captureScreenshot === 'function') {
        imageData = (emulator as any).captureScreenshot();
      }
      
      if (!imageData) {
        imageData = await emulator.getScreenDataAsBase64();
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
        modelName, 
        apiKey, 
        gameContext, 
        // TODO: Get maxTokens from context or props
        300, // Placeholder for maxTokens
        // TODO: Get romTitle from context or props
        "" // Placeholder for romTitle, changed from null to empty string
      );
      
      if (result.action === 'error') {
        console.error('AI: Error from AI service:', result.message);
        setAiStatus('Error');
      } else {
        // Set thought and action
        setAiThought(result.aiThought || null);
        setLastAction(result.action);
        
        if (result.action !== 'none') {
          // Press the button
          emulator.pressButton(result.action);
          setTimeout(() => {
            emulator.releaseButton(result.action as GameBoyButton);
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
  }, [emulator, apiKey, modelName, isEnabled, gameContext]);
  
  // Custom prompt handling
  const sendCustomPrompt = async (prompt: string) => {
    if (!emulator || !isEnabled || !apiKey || !modelName) {
      console.warn('AI: Cannot send prompt - AI not active or missing configuration.');
      return;
    }

    try {
      // Get screenshot
      let imageData: string | null = null;
      
      if (typeof (emulator as any).captureScreenshot === 'function') {
        imageData = (emulator as any).captureScreenshot();
      }
      
      if (!imageData) {
        imageData = await emulator.getScreenDataAsBase64();
      }
      
      if (!imageData) {
        console.warn('AI: Failed to capture screen data.');
        return;
      }
      
      // Send prompt to AI using the aliased service function
      const result = await sendCustomPromptService(imageData, modelName, apiKey, prompt, gameContext);
      setAiThought(result.aiThought);
      setLastAction(null);
      
    } catch (error: any) {
      console.error('AI: Error processing custom prompt:', error);
    }
  };
  
  // Start/stop AI interval based on state
  useEffect(() => {
    if (isEnabled && emulator?.isRunning()) {
      if (!apiKey || !modelName) {
        console.warn('AI: Cannot start - API Key or Model Name missing.');
        setAiStatus('Error');
        return;
      }
      
      if (intervalRef.current === null) {
        console.log('Starting AI control interval...');
        setAiStatus('Active');
        
        // Run immediately first time
        runAICycle();
        intervalRef.current = setInterval(runAICycle, captureInterval);
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
  }, [isEnabled, emulator, runAICycle, apiKey, modelName, captureInterval]);
  
  // Provide context value
  const contextValue: AIContextType = {
    aiStatus,
    aiThought,
    lastAction,
    isEnabled,
    setIsEnabled,
    setApiConfig,
    sendCustomPrompt
  };

  return (
    <AIContext.Provider value={contextValue}>
      {children}
    </AIContext.Provider>
  );
};

export {};

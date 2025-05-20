import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEmulator } from '../context/EmulatorContext';
import { getGameAction, sendCustomPrompt } from '../services/AIService';
import { 
  GameBoyButton, 
  AIGoal, 
  AISystemPrompt, 
  FeedbackContext,
  FeedbackResult,
  GameFeedbackConfig,
  AIActionResponse // Added for constructing object for executeAction
} from '../types/index'; // Corrected import path
import { 
  getAllGoals, 
  getActiveGoal, 
  getAllSystemPrompts, 
  getActiveSystemPrompt,
  setActiveGoal,
  setActiveSystemPrompt,
  executeAction
} from '../services/AIGoalService';
import { FeedbackService } from '../services/FeedbackService';

type AIStatus = 'Inactive' | 'Active' | 'Error';

interface AIControllerProps {
  onActionPerformed?: (action: GameBoyButton | 'none' | null, aiThought?: string) => void;
  onStatusChange?: (status: AIStatus) => void;
  onError?: (message: string | null) => void;
  onPromptResponse?: (response: string) => void;
  enabled?: boolean;
  config?: {
    apiKey?: string;
    modelName?: string;
    captureInterval?: number;
    gameContext?: string;
  };
  maxTokens?: number;
  romTitle?: string | null;
}

const AIController: React.FC<AIControllerProps> = ({ 
  onActionPerformed,
  onStatusChange,
  onError,
  onPromptResponse,
  enabled = false,
  config,
  maxTokens,
  romTitle
}) => {
  const emulator = useEmulator();
  const [isActive, setIsActive] = useState(enabled);
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('');
  const [captureInterval, setCaptureInterval] = useState(2000);
  const [gameContext, setGameContext] = useState('');
  const [currentGoal, setCurrentGoal] = useState<AIGoal | null>(null);
  const [currentSystemPrompt, setCurrentSystemPrompt] = useState<AISystemPrompt | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);
  const feedbackServiceRef = useRef<FeedbackService | null>(null);

  // Effect to handle external enabled prop changes
  useEffect(() => {
    setIsActive(enabled);
  }, [enabled]);
  
  // Load configuration from localStorage
  useEffect(() => {
    const storedApiKey = localStorage.getItem('aiApiKey') || '';
    const storedModel = localStorage.getItem('aiModelName') || 'openai/gpt-4o-mini';
    const storedInterval = parseInt(localStorage.getItem('aiCaptureInterval') || '2000');
    const storedContext = localStorage.getItem('aiGameContext') || '';
    
    setApiKey(storedApiKey);
    setModelName(storedModel);
    setCaptureInterval(storedInterval);
    setGameContext(storedContext);
    
    // Also update from props if provided
    if (config) {
      if (config.apiKey) setApiKey(config.apiKey);
      if (config.modelName) setModelName(config.modelName);
      if (config.captureInterval) setCaptureInterval(config.captureInterval);
      if (config.gameContext) setGameContext(config.gameContext);
    }
    
    // Load the active goal and system prompt
    setCurrentGoal(getActiveGoal());
    setCurrentSystemPrompt(getActiveSystemPrompt());
  }, [config]);

  // Update current goal and system prompt when they change
  useEffect(() => {
    const updateGoalAndPrompt = () => {
      setCurrentGoal(getActiveGoal());
      setCurrentSystemPrompt(getActiveSystemPrompt());
    };
    
    // Set up a listener to update when goals or prompts change
    window.addEventListener('aiGoalUpdated', updateGoalAndPrompt);
    window.addEventListener('aiSystemPromptUpdated', updateGoalAndPrompt);
    
    return () => {
      window.removeEventListener('aiGoalUpdated', updateGoalAndPrompt);
      window.removeEventListener('aiSystemPromptUpdated', updateGoalAndPrompt);
    };
  }, []);

  // Initialize FeedbackService and load game-specific config if needed
  useEffect(() => {
    feedbackServiceRef.current = new FeedbackService();
    
    if (romTitle) {
      feedbackServiceRef.current.resetEpisode(romTitle);
    }
  }, []);

  // Update feedback service when romTitle changes
  useEffect(() => {
    if (feedbackServiceRef.current && romTitle) {
      feedbackServiceRef.current.resetEpisode(romTitle);
      // Potentially load/reload specific game config for romTitle here
      console.log(`AIController: Feedback episode reset for ${romTitle}`);
    }
  }, [romTitle]);

  const runAICycle = useCallback(async () => {
    if (!emulator || isProcessingRef.current || !isActive || !feedbackServiceRef.current) {
      return; 
    }

    const isRunning = emulator.isRunning();
    if (!isRunning) {
      return;
    }

    isProcessingRef.current = true;

    try {
      // First try to use the captureScreenshot method if available
      let imageData: string | null = null;
      
      // Try the new method first (with type assertion for safety)
      if (typeof (emulator as any).captureScreenshot === 'function') {
        imageData = (emulator as any).captureScreenshot();
      }
      
      // Fall back to the old method if needed
      if (!imageData) {
        imageData = await emulator.getScreenDataAsBase64();
      }
      
      if (!imageData) {
        console.warn('AIController: Failed to capture screen data.');
        if (onError) onError('Failed to capture screen data for AI.');
        if (onStatusChange) onStatusChange('Error');
        isProcessingRef.current = false;
        return;
      }

      // 1. Poll for feedback BEFORE getting AI action
      const feedbackContext: FeedbackContext = {
        gameTitle: romTitle || "Unknown Game",
        currentEmulatorTime: Date.now(), // Or a more precise emulator time if available
        // lastAction: can be tracked if needed
      };
      const feedbackResult: FeedbackResult = await feedbackServiceRef.current.pollEvents(feedbackContext, imageData);

      // Log feedback for debugging
      console.log('AIController: Feedback Received:', feedbackResult);
      feedbackResult.textFeedback.forEach((fbText: string) => { // Explicitly typed fbText
          if (onActionPerformed) onActionPerformed(null, `FEEDBACK: ${fbText}`);
      });
      
      const result = await getGameAction(
        imageData, 
        modelName, 
        apiKey, 
        gameContext, 
        maxTokens, 
        romTitle || "Unknown Game",
        feedbackResult.textFeedback // Pass feedback text array
      );
      
      if (result.action === 'error') {
        console.error('AIController: Error from AI service:', result.message);
        if (onError) onError(result.message || 'Unknown AI service error.');
        if (onStatusChange) onStatusChange('Error');
      } else {
        if (onActionPerformed) onActionPerformed(result.action, result.aiThought);
        
        // Construct AIActionResponse for executeAction
        const actionToExecute: AIActionResponse = {
          action: result.action,
          reasoning: result.aiThought || '',
          // sequence: result.sequence // If AIService starts returning sequences
        };
        executeAction(actionToExecute, emulator);
        
        if (onStatusChange) onStatusChange('Active'); 
      }
    } catch (error: any) {
      console.error('AIController: Unexpected error in AI cycle:', error);
      if (onError) onError(error.message || 'An unexpected error occurred in the AI loop.');
      if (onStatusChange) onStatusChange('Error');
    } finally {
      isProcessingRef.current = false;
    }
  }, [emulator, apiKey, modelName, isActive, gameContext, maxTokens, romTitle, onActionPerformed, onError, onStatusChange]);

  // Handle custom user prompts
  const handleCustomPrompt = useCallback(async (promptText: string) => { // Renamed prompt to promptText for clarity
    if (!emulator || !isActive || !apiKey || !modelName || !feedbackServiceRef.current) {
      if (onError) onError('AI not active or missing configuration, or feedback service unavailable.');
      return;
    }

    try {
      // First try to use the captureScreenshot method if available
      let imageData: string | null = null;
      
      // Try the new method first (with type assertion for safety)
      if (typeof (emulator as any).captureScreenshot === 'function') {
        imageData = (emulator as any).captureScreenshot();
      }
      
      // Fall back to the old method if needed
      if (!imageData) {
        imageData = await emulator.getScreenDataAsBase64();
      }
      
      if (!imageData) {
        console.warn('AIController: Failed to capture screen data for custom prompt.');
        if (onError) onError('Failed to capture screen data for AI.');
        return;
      }
      
      // Get feedback to include with the custom prompt
      const feedbackContext: FeedbackContext = {
        gameTitle: romTitle || "Unknown Game",
        currentEmulatorTime: Date.now(),
      };
      const feedbackResult: FeedbackResult = await feedbackServiceRef.current.pollEvents(feedbackContext, imageData);
      
      // Send the custom prompt to the AI with the current screen and feedback
      const result = await sendCustomPrompt(
        imageData, 
        modelName, 
        apiKey, 
        promptText, 
        gameContext,
        feedbackResult.textFeedback // Pass feedback text array
      );
      
      // Send the response back up to the parent component
      if (onPromptResponse) onPromptResponse(result.aiThought);
      
      // Also send this as an AI thought for display
      if (onActionPerformed) onActionPerformed(null, result.aiThought);
      
    } catch (error: any) {
      console.error('AIController: Error processing custom prompt:', error);
      if (onError) onError(error.message || 'An error occurred processing your prompt.');
    }
  }, [emulator, isActive, apiKey, modelName, gameContext, onPromptResponse, onActionPerformed, onError]);

  useEffect(() => {
    if (isActive && emulator?.isRunning()) {
      if (!apiKey || !modelName) {
        console.warn('AI cannot start: API Key or Model Name missing.');
        if (onError) onError('API Key or Model Name is missing.');
        if (onStatusChange) onStatusChange('Error');
        return;
      }
      
      if (intervalRef.current === null) {
        console.log('Starting AI control interval...');
        if (onStatusChange) onStatusChange('Active');
        
        // Run immediately first time
        runAICycle(); 
        intervalRef.current = setInterval(runAICycle, captureInterval);
      }
    } else {
      if (intervalRef.current !== null) {
        console.log('Stopping AI control interval...');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        if (onStatusChange) onStatusChange('Inactive');
      }
    }
    
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, emulator, runAICycle, captureInterval, apiKey, modelName, onStatusChange, onError]);

  // Expose the custom prompt handler
  useEffect(() => {
    // @ts-ignore - Attaching a method to window for external access
    window.sendCustomAIPrompt = handleCustomPrompt;
    
    return () => {
      // @ts-ignore - Clean up
      delete window.sendCustomAIPrompt;
    };
  }, [handleCustomPrompt]);

  // Public methods to manage goals and system prompts
  const setGoal = useCallback((goalId: string | null) => {
    const success = setActiveGoal(goalId);
    if (success) {
      setCurrentGoal(getActiveGoal());
      window.dispatchEvent(new CustomEvent('aiGoalUpdated'));
    }
    return success;
  }, []);

  const setSystemPrompt = useCallback((promptId: string) => {
    const success = setActiveSystemPrompt(promptId);
    if (success) {
      setCurrentSystemPrompt(getActiveSystemPrompt());
      window.dispatchEvent(new CustomEvent('aiSystemPromptUpdated'));
    }
    return success;
  }, []);

  // Expose the goal and system prompt management methods
  useEffect(() => {
    // @ts-ignore - Attaching methods to window for external access
    window.aiController = {
      setGoal,
      setSystemPrompt,
      getCurrentGoal: () => currentGoal,
      getCurrentSystemPrompt: () => currentSystemPrompt,
      getAllGoals,
      getAllSystemPrompts,
      // Expose feedback service for debugging or manual event injection if needed
      getFeedbackService: () => feedbackServiceRef.current 
    };
    
    return () => {
      // @ts-ignore - Clean up
      delete window.aiController;
    };
  }, [setGoal, setSystemPrompt, currentGoal, currentSystemPrompt]);

  return null; // This is a headless component
};

export default AIController;

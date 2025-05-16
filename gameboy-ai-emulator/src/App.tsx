// Updated App.tsx with AIConsole integration, Knowledge Base, Navigation, and Settings Modal
import React, { useState, useCallback, useEffect, useRef } from 'react';
import './App.css';
import { EmulatorProvider } from './context/EmulatorContext';
import EmulatorDisplay from './components/EmulatorDisplay';
import Controls from './components/Controls';
import ConfigPanel from './components/ConfigPanel';
import StatusDisplay from './components/StatusDisplay';
import LegalDisclaimer from './components/LegalDisclaimer';
import AIController from './components/AIController';
import AIConsole from './components/GameAIConsole';
import AIGoalsPanel from './components/AIGoalsPanel';  // Import our new component
import { GameBoyButton } from './types';
import { sendCustomPrompt, analyzePlayerPosition, analyzeGridLocation } from './services/AIService';
import KnowledgeBaseView from './components/KnowledgeBaseView';
import KnowledgeBaseButton from './components/KnowledgeBaseButton';
import SettingsModal from './components/SettingsModal';
import { CogIcon } from './components/Icons';
import NavigationPanel from './components/NavigationPanel';
import { getAllKnowledgeEntries, getAllNavigationPoints } from './services/KnowledgeBaseService';
import { executeNavigationSequence } from './services/NavigationService';
import { NavigationInstruction } from './services/GridNavigationService';

const App: React.FC = () => {
  // References for canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null);
  
  // Status states
  const [romTitle, setRomTitle] = useState<string | null>(null);
  const [emulatorStatus, setEmulatorStatus] = useState<'Idle' | 'No ROM' | 'Ready' | 'Running' | 'Paused' | 'Error'>('No ROM');
  const [aiStatus, setAiStatus] = useState<'Inactive' | 'Active' | 'Error'>('Inactive');
  const [lastAiAction, setLastAiAction] = useState<GameBoyButton | 'none' | null>(null);
  const [aiThought, setAiThought] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Track the last 10 AI button presses
  const [lastTenActions, setLastTenActions] = useState<(GameBoyButton | 'none')[]>([]);
  
  // AI configuration
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiConfig, setAiConfig] = useState({
    apiKey: '',
    modelName: '',
    captureInterval: 2000,
    gameContext: ''
  });
  
  // Knowledge base and navigation states
  const [isKnowledgeBaseOpen, setIsKnowledgeBaseOpen] = useState(false);
  const [knowledgeCount, setKnowledgeCount] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationProgress, setNavigationProgress] = useState<{
    current: number;
    total: number;
    currentAction: NavigationInstruction | null;
  }>({ current: 0, total: 0, currentAction: null });

  // Grid navigation states
  const [screenCapture, setScreenCapture] = useState<string | null>(null);
  
  // Settings Modal State
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [maxTokensForAI, setMaxTokensForAI] = useState(300); // Default value
  const [simpleMode, setSimpleMode] = useState(() => {
    const saved = localStorage.getItem('simpleMode');
    return saved === 'true';
  });
  
  // AI Goals Panel State
  const [isAIGoalsPanelOpen, setIsAIGoalsPanelOpen] = useState(false);

  // Auto-navigation sequence generator reference
  const navigationSequenceRef = useRef<Generator<any, void, unknown> | null>(null);
  
  // Emulator instance reference - not typed perfectly but works for our needs
  const emulatorRef = useRef<any>(null);

  // Effect to update the state once the ref is populated
  useEffect(() => {
    if (canvasRef.current) {
      setCanvasElement(canvasRef.current);
    }
    // Load maxTokens from localStorage on initial load
    const savedMaxTokens = localStorage.getItem('aiMaxTokens');
    if (savedMaxTokens) {
      setMaxTokensForAI(parseInt(savedMaxTokens, 10));
    }
  }, []);
  
  // Load knowledge base count on mount and when AI status changes
  useEffect(() => {
    // Only update counts if AI is active
    if (aiStatus === 'Active') {
      updateKnowledgeCount();
    }
  }, [aiStatus]);
  
  // Update knowledge count
  const updateKnowledgeCount = () => {
    const entries = getAllKnowledgeEntries();
    const navPoints = getAllNavigationPoints();
    setKnowledgeCount(entries.length + navPoints.length);
  };
  
  // Toggle knowledge base view
  const toggleKnowledgeBase = () => {
    setIsKnowledgeBaseOpen(!isKnowledgeBaseOpen);
    
    // Update counts when opening the knowledge base
    if (!isKnowledgeBaseOpen) {
      updateKnowledgeCount();
    }
  };
  
  // Handler for AI configuration changes
  const handleConfigChange = useCallback((config: {
    apiKey: string,
    modelName: string,
    captureInterval: number,
    gameContext: string
  }) => {
    setAiConfig(config);
  }, []);
  
  // Handler for AI status changes from ConfigPanel
  const handleAiStatusChange = useCallback((status: 'Inactive' | 'Active' | 'Error') => {
    setAiStatus(status);
    setAiEnabled(status === 'Active');
  }, []);
  
  // Handler for custom prompts from the AIConsole
  const handleSendPrompt = useCallback(async (prompt: string) => {
    if (aiStatus !== 'Active' || !aiConfig.apiKey || !aiConfig.modelName) {
      setErrorMessage('AI not active or missing configuration');
      return;
    }
    
    try {
      const emulator = emulatorRef.current;
      if (!emulator) {
        setErrorMessage('Emulator not available');
        return;
      }
      
      // Get screenshot
      let imageData: string | null = null;
      if (typeof emulator.captureScreenshot === 'function') {
        imageData = emulator.captureScreenshot();
      } else if (typeof emulator.getScreenDataAsBase64 === 'function') {
        imageData = await emulator.getScreenDataAsBase64();
      }
      
      if (!imageData) {
        setErrorMessage('Failed to capture game screen');
        return;
      }
      
      // Send the prompt to AI
      const response = await sendCustomPrompt(
        imageData, 
        aiConfig.modelName, 
        aiConfig.apiKey, 
        prompt,
        aiConfig.gameContext
      );
      
      // Update the AI thought to show the response
      setAiThought(response.aiThought);
      
      // Update knowledge count since AI might have added knowledge
      updateKnowledgeCount();
    } catch (error) {
      console.error('Error sending custom prompt:', error);
      setErrorMessage(`Error sending prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [aiStatus, aiConfig]);
    // Handle grid navigation request from the NavigationPanel
  const handleNavigationRequest = useCallback((instructions: NavigationInstruction[]) => {
    if (!emulatorRef.current || instructions.length === 0 || isNavigating) {
      return;
    }
    
    try {
      // Stop any existing navigation
      if (navigationSequenceRef.current) {
        navigationSequenceRef.current.return();
        navigationSequenceRef.current = null;
      }
      
      // Convert grid navigation instructions to button presses
      const buttonSequence: GameBoyButton[] = [];
      instructions.forEach(instruction => {
        // For each instruction, we'll press the button the required number of times
        // Most instructions are directional (up, down, left, right) or interaction (a, b)
        buttonSequence.push(instruction.button);
      });
      
      // Start a new navigation sequence
      setIsNavigating(true);
      setNavigationProgress({
        current: 0,
        total: buttonSequence.length,
        currentAction: instructions[0]
      });
      
      // Create a generator for the navigation sequence
      navigationSequenceRef.current = executeNavigationSequence(
        emulatorRef.current,
        buttonSequence,
        500 // 500ms between actions
      );
      
      // Start the navigation process
      const runNavigationStep = () => {
        if (navigationSequenceRef.current) {
          const result = navigationSequenceRef.current.next();
          
          if (!result.done) {
            // Find the current instruction
            const currentInstruction = instructions[Math.min(result.value.stepNumber, instructions.length - 1)];
            
            // Update progress
            setNavigationProgress({
              current: result.value.stepNumber,
              total: result.value.totalSteps,
              currentAction: currentInstruction
            });
            
            // Add to last ten actions
            setLastTenActions(prev => {
              const newActions = [...prev];
              newActions.push(result.value.button);
              return newActions.slice(-10);
            });
            
            // Schedule next step
            setTimeout(runNavigationStep, 500);
          } else {
            // Navigation complete
            setIsNavigating(false);
            navigationSequenceRef.current = null;
          }
        }
      };
      
      // Start the sequence
      runNavigationStep();
    } catch (error) {
      console.error('Error executing navigation sequence:', error);
      setErrorMessage(`Navigation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsNavigating(false);
    }
  }, [isNavigating]);
  
  // Store emulator reference when it's created by EmulatorDisplay
  const handleEmulatorCreated = useCallback((emulator: any) => {
    emulatorRef.current = emulator;
  }, []);

  // Capture the current screen for grid analysis and overlay
  const captureScreenForGrid = useCallback(async () => {
    if (emulatorRef.current) {
      try {
        const screenData = emulatorRef.current.captureScreenshot ? 
          emulatorRef.current.captureScreenshot() : 
          emulatorRef.current.getScreenDataAsBase64 ? 
            emulatorRef.current.getScreenDataAsBase64() : 
            null;
        
        setScreenCapture(screenData);
        return screenData;
      } catch (error) {
        console.error('Error capturing screen:', error);
        return null;
      }
    }
    return null;
  }, []);
  // Detect player position on the grid using AI
  const detectPlayerPosition = useCallback(async (): Promise<{x: number, y: number, confidence: number} | null> => {
    if (aiStatus !== 'Active' || !aiConfig.apiKey || !aiConfig.modelName) {
      setErrorMessage('AI not active or missing configuration');
      return null;
    }

    // Capture current screen
    const screenData = await captureScreenForGrid();
    if (!screenData) {
      setErrorMessage('Failed to capture game screen');
      return null;
    }

    try {
      // Use AI to analyze player position on grid
      const result = await analyzePlayerPosition(
        screenData,
        aiConfig.modelName,
        aiConfig.apiKey
      );

      if (result.confidence >= 0.6) {
        // If confidence is high enough, update AI thought
        setAiThought(`I detected the player at grid position (${result.x}, ${result.y}) with ${Math.round(result.confidence * 100)}% confidence.`);
        
        // Return the result for use in the NavigationPanel
        return result;
      } else {
        setAiThought(`I'm not confident about the player's position. Best guess: (${result.x}, ${result.y}) with only ${Math.round(result.confidence * 100)}% confidence.`);
        setErrorMessage('Could not confidently detect player position');
        return null;
      }
    } catch (error) {
      console.error('Error analyzing player position:', error);
      setErrorMessage(`Error detecting player position: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }, [aiStatus, aiConfig, captureScreenForGrid]);
  
  // Analyze the content at a specific grid location
  const analyzeGridLocationContent = useCallback(async (gridX: number, gridY: number) => {
    if (aiStatus !== 'Active' || !aiConfig.apiKey || !aiConfig.modelName) {
      setErrorMessage('AI not active or missing configuration');
      return null;
    }

    // Capture current screen
    const screenData = await captureScreenForGrid();
    if (!screenData) {
      setErrorMessage('Failed to capture game screen');
      return null;
    }

    try {
      // Use AI to analyze what's at this grid location
      const description = await analyzeGridLocation(
        screenData,
        gridX,
        gridY,
        aiConfig.modelName,
        aiConfig.apiKey
      );

      if (description) {
        // Update AI thought with the analysis
        setAiThought(`At grid position (${gridX}, ${gridY}): ${description}`);
        return description;
      } else {
        setErrorMessage('Could not analyze grid location');
        return null;
      }
    } catch (error) {
      console.error('Error analyzing grid location:', error);
      setErrorMessage(`Error analyzing grid: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }, [aiStatus, aiConfig, captureScreenForGrid]);
  
  // Settings Modal Handlers
  const toggleSettingsModal = () => {
    setIsSettingsModalOpen(!isSettingsModalOpen);
  };
  
  // Toggle AI Goals Panel
  const toggleAIGoalsPanel = () => {
    setIsAIGoalsPanelOpen(!isAIGoalsPanelOpen);
  };
  
  const handleSaveSettings = (newMaxTokens: number) => {
    setMaxTokensForAI(newMaxTokens);
    localStorage.setItem('aiMaxTokens', newMaxTokens.toString());
  };

  const handleSimpleModeChange = (enabled: boolean) => {
    setSimpleMode(enabled);
    localStorage.setItem('simpleMode', enabled ? 'true' : 'false');
  };
  
  return (
    <EmulatorProvider canvasElement={canvasElement}>
      <div className="min-h-screen bg-gray-900 text-white flex flex-col p-6">
        <div className="flex justify-between items-center mb-6 w-full max-w-8xl mx-auto">
          <h1 className="text-4xl font-bold text-indigo-400 drop-shadow-lg">Game Boy AI Emulator</h1>
          <button 
            onClick={toggleSettingsModal}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white"
            title="AI Settings"
          >
            <CogIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-10 w-full max-w-8xl mx-auto">
          {/* Left Column: Emulator Display and Controls - increased width for larger Game Boy */}
          <div className="flex flex-col items-center space-y-8 flex-shrink-0 lg:w-3/5">
            <EmulatorDisplay 
              ref={canvasRef} 
              onEmulatorCreated={handleEmulatorCreated}
            />
            <Controls 
              onStatusChange={(status) => setEmulatorStatus(status)}
              onRomTitleChange={(title) => setRomTitle(title)}
              onError={(error) => setErrorMessage(error)}
            />
            
            {/* Knowledge Base button - shown when AI is active and not in Simple Mode */}
            {aiStatus === 'Active' && !simpleMode && (
              <div className="w-full flex justify-center mt-4">
                <KnowledgeBaseButton 
                  onClick={toggleKnowledgeBase}
                  knowledgeCount={knowledgeCount}
                />
              </div>
            )}
          </div>
          
          {/* Right Column: Config, Status, and AI - adjusted width */}
          <div className="flex flex-col space-y-6 flex-grow lg:w-2/5">
            <ConfigPanel 
              onAiStatusChange={handleAiStatusChange}
              onConfigChange={handleConfigChange}
            />            
            {/* Navigation Panel - Only visible when AI is active and not in Simple Mode */}
            {aiStatus === 'Active' && !simpleMode && (
              <NavigationPanel 
                onRequestNavigate={handleNavigationRequest}
                isNavigating={isNavigating}
                progress={navigationProgress}
                screenCapture={screenCapture}
                onScreenCaptureRequest={captureScreenForGrid}
                onDetectPlayerPosition={detectPlayerPosition}
                onAnalyzeGridLocation={analyzeGridLocationContent}
              />
            )}
            
            {/* AI Thought Console Panel - Only visible when AI is active and not in Simple Mode */}
            {aiStatus === 'Active' && !simpleMode && (
              <div className="w-full">
                <h3 className="text-lg font-semibold text-indigo-300 mb-2">AI Insights</h3>
                <AIConsole 
                  isActive={aiStatus === 'Active'}
                  onSendPrompt={handleSendPrompt}
                  aiThought={aiThought}
                  lastAction={lastAiAction}
                />
              </div>
            )}
              {/* AI Goals Panel - Only visible when AI is active and not in Simple Mode */}
            {aiStatus === 'Active' && !simpleMode && isAIGoalsPanelOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="w-full max-w-4xl max-h-[90vh] overflow-auto">
                  <AIGoalsPanel onClose={() => setIsAIGoalsPanelOpen(false)} />
                </div>
              </div>
            )}
              {/* AI Goals Panel Toggle Button */}
            {aiStatus === 'Active' && !simpleMode && (
              <div className="w-full flex justify-end mb-2">
                <button 
                  onClick={toggleAIGoalsPanel}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm"
                >
                  Manage AI Goals & Prompts
                </button>
              </div>
            )}
            
            <StatusDisplay 
              romTitle={romTitle}
              emulatorStatus={emulatorStatus}
              aiStatus={aiStatus}
              lastAiAction={lastAiAction}
              errorMessage={errorMessage}
              aiThought={aiThought}
              lastTenActions={lastTenActions}
            />
            
            <AIController 
              onActionPerformed={(action: GameBoyButton | 'none' | null, thought?: string) => {
                setLastAiAction(action);
                if (thought) setAiThought(thought);
                
                // Add to last 10 actions list if it's a valid button press
                if (action && action !== null) {
                  setLastTenActions(prev => {
                    const newActions = [...prev];
                    newActions.push(action);
                    // Keep only the last 10 actions
                    return newActions.slice(-10);
                  });
                }
                
                // Update knowledge count since AI might have added knowledge
                updateKnowledgeCount();
              }}
              onStatusChange={(status: 'Inactive' | 'Active' | 'Error') => setAiStatus(status)}
              onError={(error: string | null) => setErrorMessage(error)}
              enabled={aiEnabled}
              config={aiConfig}
              maxTokens={maxTokensForAI} // Pass maxTokens to AIController
            />
            
            <LegalDisclaimer />
          </div>
        </div>
        
        {/* Knowledge Base Modal - shown when isKnowledgeBaseOpen is true and not in Simple Mode */}
        {isKnowledgeBaseOpen && !simpleMode && (
          <KnowledgeBaseView 
            isVisible={isKnowledgeBaseOpen}
            onClose={() => setIsKnowledgeBaseOpen(false)}
            currentRomTitle={romTitle} // Pass romTitle here
          />
        )}
        <SettingsModal 
          isOpen={isSettingsModalOpen}
          onClose={toggleSettingsModal}
          currentMaxTokens={maxTokensForAI}
          onSave={handleSaveSettings}
          simpleMode={simpleMode}
          onSimpleModeChange={handleSimpleModeChange}
        />
        {isNavigating && (
          <div className="fixed bottom-4 right-4 bg-indigo-900 text-white p-3 rounded-lg shadow-lg z-50">
            <div className="text-sm font-medium">Auto-navigating...</div>
            <div className="text-xs mt-1">
              Step {navigationProgress.current} of {navigationProgress.total}
            </div>
            {navigationProgress.currentAction && (
              <div className="text-xs mt-1">
                Current action: <span className="font-bold">{navigationProgress.currentAction.button.toUpperCase()}</span>
              </div>
            )}
            <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
              <div 
                className="bg-indigo-500 h-2 rounded-full" 
                style={{ 
                  width: `${(navigationProgress.current / navigationProgress.total) * 100}%` 
                }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </EmulatorProvider>
  );
};

export default App;

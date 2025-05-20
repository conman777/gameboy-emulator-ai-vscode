// Updated App.tsx with AIConsole integration, Knowledge Base, and Settings Modal
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
import GhostFreeLayout from './components/GhostFreeLayout'; // Import new anti-ghosting component
import { GameBoyButton } from './types';
import { sendCustomPrompt } from './services/AIService'; 
import KnowledgeBaseView from './components/KnowledgeBaseView';
import KnowledgeBaseButton from './components/KnowledgeBaseButton';
import SettingsModal from './components/SettingsModal';
import { CogIcon } from './components/Icons';
import { getAllKnowledgeEntries, getAllNavigationPoints } from './services/KnowledgeBaseService';

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
  
  // Knowledge base states
  const [isKnowledgeBaseOpen, setIsKnowledgeBaseOpen] = useState(false);
  const [knowledgeCount, setKnowledgeCount] = useState(0);
  
  // Settings Modal State
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [maxTokensForAI, setMaxTokensForAI] = useState(300); // Default value
  const [simpleMode, setSimpleMode] = useState(() => {
    const saved = localStorage.getItem('simpleMode');
    return saved === 'true';
  });
  
  // AI Goals Panel State
  const [isAIGoalsPanelOpen, setIsAIGoalsPanelOpen] = useState(false);

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

  // Memoized handlers for Controls component
  const handleEmulatorStatusChange = useCallback((status: 'Idle' | 'No ROM' | 'Ready' | 'Running' | 'Paused' | 'Error') => {
    setEmulatorStatus(status);
  }, []); // setEmulatorStatus is stable

  const handleRomTitleChange = useCallback((title: string | null) => {
    setRomTitle(title);
  }, []); // setRomTitle is stable

  const handleErrorMessageChange = useCallback((error: string | null) => {
    setErrorMessage(error);
  }, []); // setErrorMessage is stable
  
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
    
  // Store emulator reference when it's created by EmulatorDisplay
  const handleEmulatorCreated = useCallback((emulator: any) => {
    emulatorRef.current = emulator;
  }, []);

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
      {/* Use h-screen flex flex-col, overflow-hidden to prevent page-level scrolling */}
      <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden">
        <LegalDisclaimer />
        {/* Main content area with flex-1 to take all available space */}
        <div className="flex-1 w-full px-2 pb-2 overflow-hidden">
          {/* Max width container with h-full to ensure proper height constraints */}
          <div className="max-w-7xl mx-auto h-full flex flex-col lg:flex-row gap-2">
            {/* Left Column: Emulator and Controls - use flex-col and allow internal scrolling */}
            <div className="lg:w-2/3 h-full flex flex-col overflow-hidden">
              {/* Emulator container with flex-shrink-0 to prevent compression */}
              <div className="flex-shrink-0">
                <EmulatorDisplay
                  ref={canvasRef}
                  onEmulatorCreated={handleEmulatorCreated}
                />
              </div>
              {/* Controls in a scrollable container */}
              <div className="flex-1 overflow-y-auto mt-2 pr-1">
                <Controls
                  onStatusChange={handleEmulatorStatusChange}
                  onRomTitleChange={handleRomTitleChange}
                  onError={handleErrorMessageChange}
                />
              </div>
            </div>
            
            {/* Right Column: Config, Status, and AI - with internal scrolling */}
            <div className="lg:w-1/3 h-full overflow-hidden flex flex-col">
              <GhostFreeLayout className="flex-1 flex flex-col overflow-y-auto pr-1">
                <ConfigPanel
                  onAiStatusChange={handleAiStatusChange}
                  onConfigChange={handleConfigChange}
                />

                {/* AI Thought Console Panel */}
                {aiStatus === 'Active' && !simpleMode && (
                  <div className="w-full mt-2">
                    <AIConsole 
                      isActive={aiStatus === 'Active'}
                      onSendPrompt={handleSendPrompt}
                      aiThought={aiThought}
                      lastAction={lastAiAction}
                    />
                  </div>
                )}

                {/* Knowledge Base button - shown when AI is active */}
                {aiStatus === 'Active' && !simpleMode && (
                  <div className="w-full flex justify-center my-2">
                    <KnowledgeBaseButton
                      onClick={toggleKnowledgeBase}
                      knowledgeCount={knowledgeCount}
                    />
                  </div>
                )}

                {/* AI Goals Panel Toggle Button */}
                {aiStatus === 'Active' && !simpleMode && (
                  <div className="w-full flex justify-end my-2">
                    <button 
                      onClick={toggleAIGoalsPanel}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-md text-sm"
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
                  maxTokens={maxTokensForAI}
                />
              </GhostFreeLayout>
            </div>
          </div>
        </div>
        
        {/* AI Goals Panel - Modal overlay */}
        {aiStatus === 'Active' && !simpleMode && isAIGoalsPanelOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="w-full max-w-4xl max-h-[90vh] overflow-auto">
              <AIGoalsPanel onClose={() => setIsAIGoalsPanelOpen(false)} />
            </div>
          </div>
        )}
        
        {/* Knowledge Base Modal */}
        {isKnowledgeBaseOpen && !simpleMode && (
          <KnowledgeBaseView 
            isVisible={isKnowledgeBaseOpen}
            onClose={() => setIsKnowledgeBaseOpen(false)}
            currentRomTitle={romTitle}
          />
        )}
        
        {/* Settings Modal */}
        <SettingsModal 
          isOpen={isSettingsModalOpen}
          onClose={toggleSettingsModal}
          currentMaxTokens={maxTokensForAI}
          onSave={handleSaveSettings}
          simpleMode={simpleMode}
          onSimpleModeChange={handleSimpleModeChange}
        />
      </div>
    </EmulatorProvider>
  );
};

export default App;

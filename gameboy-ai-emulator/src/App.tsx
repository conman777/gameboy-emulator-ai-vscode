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
import { EmulatorWrapperApi } from './emulator/EmulatorWrapper'; // Import EmulatorWrapperApi
import KnowledgeBaseView from './components/KnowledgeBaseView';
import KnowledgeBaseButton from './components/KnowledgeBaseButton';
import SettingsModal from './components/SettingsModal';
import { CogIcon } from './components/Icons';
import { getAllKnowledgeEntries, getAllNavigationPoints } from './services/KnowledgeBaseService';
import { ERROR_MESSAGE_DURATION } from './constants';
import { AIProvider, useAI, AIConfig as AIConfigTypeFromContext, AIStatus } from './context/AIContext'; // Import AIConfigType

const App: React.FC = () => {
  // References for canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null);
  
  // Status states
  const [romTitle, setRomTitle] = useState<string | null>(null);
  const [emulatorStatus, setEmulatorStatus] = useState<'Idle' | 'No ROM' | 'Ready' | 'Running' | 'Paused' | 'Error'>('No ROM');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // AI Context
  const { 
    aiStatus, 
    aiThought, 
    lastAction, 
    lastTenActions, 
    aiConfig, 
    maxTokensForAI, 
    isEnabled: aiEnabled, 
    setIsEnabled: setAiEnabled, 
    setAiConfig, 
    setMaxTokensForAI, 
    sendCustomPrompt: sendCustomPromptAIContext, 
    addLastAction, 
    setAiThought 
  } = useAI();
  
  // Knowledge base states
  const [isKnowledgeBaseOpen, setIsKnowledgeBaseOpen] = useState(false);
  const [knowledgeCount, setKnowledgeCount] = useState(0);
  
  // Settings Modal State
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [simpleMode, setSimpleMode] = useState(() => {
    const saved = localStorage.getItem('simpleMode');
    return saved === 'true';
  });
  
  // AI Goals Panel State
  const [isAIGoalsPanelOpen, setIsAIGoalsPanelOpen] = useState(false);

  // Emulator instance reference
  const emulatorRef = useRef<EmulatorWrapperApi | null>(null);

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
  }, [setMaxTokensForAI]); // Add setMaxTokensForAI to dependency array
  
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
  const handleConfigChange = useCallback((config: Partial<AIConfigTypeFromContext>) => { // Allow partial updates
    setAiConfig((prevConfig: AIConfigTypeFromContext) => ({ ...prevConfig, ...config } as AIConfigTypeFromContext));
  }, [setAiConfig]); // Use setAiConfig from context
  
  // Handler for AI status changes from ConfigPanel
  const handleAiStatusChange = useCallback((status: AIStatus) => {
    setAiEnabled(status === 'Active');
    // Optionally, update aiConfig.isActive here if it's managed separately
    // setAiConfig(prev => ({...prev, isActive: status === 'Active'}));
  }, [setAiEnabled]); // Use setAiEnabled from context

  // Memoized handlers for Controls component
  const handleEmulatorStatusChange = useCallback((status: 'Idle' | 'No ROM' | 'Ready' | 'Running' | 'Paused' | 'Error') => {
    setEmulatorStatus(status);
  }, []); // setEmulatorStatus is stable

  const handleRomTitleChange = useCallback((title: string | null) => {
    setRomTitle(title);
  }, []); // setRomTitle is stable

  const handleErrorMessageChange = useCallback((error: string | null) => {
    setErrorMessage(error);
    // Clear the error message after 10 seconds
    if (error) {
      setTimeout(() => {
        setErrorMessage(null);
      }, ERROR_MESSAGE_DURATION); // Use constant for duration
    }
  }, []); // setErrorMessage is stable
  
  // Handler for custom prompts from the AIConsole
  const handleSendPrompt = useCallback(async (prompt: string) => {
    await sendCustomPromptAIContext(prompt, romTitle); // Use sendCustomPrompt from AIContext
    updateKnowledgeCount(); // Update knowledge count since AI might have added knowledge
  }, [sendCustomPromptAIContext, romTitle]);
    
  // Store emulator reference when it's created by EmulatorDisplay
  const handleEmulatorCreated = useCallback((emulator: EmulatorWrapperApi) => {
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
      <AIProvider currentRomTitle={romTitle}> {/* Wrap with AIProvider */}
        {/* Main container with dark background */}
        <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden">
          <LegalDisclaimer />
          {/* Main content area */}
          <div className="flex-1 w-full px-4 py-4 overflow-hidden">
            {/* Two-column layout on larger screens */}
            <div className="max-w-7xl mx-auto h-full flex flex-col lg:flex-row gap-4">
              {/* Left Column: Emulator and Controls */}
              <div className="lg:w-2/3 h-full flex flex-col space-y-4 overflow-hidden">
                {/* Game Boy Screen */}
                <div className="panel game-screen flex-shrink-0">
                  <EmulatorDisplay
                    ref={canvasRef}
                    onEmulatorCreated={handleEmulatorCreated}
                  />
                </div>
                
                {/* Manual Controls Panel */}
                <div className="panel flex-shrink-0">
                  <h2 className="panel-title">Manual Controls</h2>
                  <Controls
                    onStatusChange={handleEmulatorStatusChange}
                    onRomTitleChange={handleRomTitleChange}
                    onError={handleErrorMessageChange}
                  />
                </div>
              </div>
              
              {/* Right Column: Config, Status, and AI */}
              <div className="lg:w-1/3 h-full overflow-y-auto pr-2 space-y-4">
                {/* Settings button at the top */}
                <div className="flex justify-end mb-2">
                  <button
                    onClick={toggleSettingsModal}
                    className="p-2 text-gray-400 hover:text-white"
                    aria-label="Settings"
                  >
                    <CogIcon className="h-6 w-6" />
                  </button>
                </div>
                
                {/* AI Configuration Panel */}
                <div className="panel">
                  <h2 className="panel-title">AI Configuration</h2>
                  <ConfigPanel
                    onAiStatusChange={handleAiStatusChange}
                    onConfigChange={handleConfigChange}
                  />
                </div>

                {/* AI Thought Console - shows when AI is active and not in simple mode */}
                {(aiEnabled || aiStatus === 'Active') && !simpleMode && (
                  <div className="panel">
                    <h2 className="panel-title">AI Thoughts</h2>
                    <AIConsole 
                      isActive={aiStatus === 'Active' || aiEnabled}
                      onSendPrompt={handleSendPrompt}
                      aiThought={aiThought}
                      lastAction={lastAction}
                    />
                  </div>
                )}
                
                {/* Knowledge Base button - only when AI is active */}
                {aiStatus === 'Active' && !simpleMode && (
                  <div className="panel flex justify-center">
                    <KnowledgeBaseButton
                      onClick={toggleKnowledgeBase}
                      knowledgeCount={knowledgeCount}
                    />
                  </div>
                )}

                {/* Debug button to force show AI console */}
                <div className="panel">
                  <button
                    onClick={() => setSimpleMode(false)}
                    className="btn btn-secondary w-full"
                    aria-label="Show AI Console"
                  >
                    Show AI Console
                  </button>
                </div>
                
                {/* Status Display Panel */}
                <div className="panel">
                  <h2 className="panel-title">Status</h2>
                  <StatusDisplay 
                    romTitle={romTitle}
                    emulatorStatus={emulatorStatus}
                    aiStatus={aiStatus}
                    lastAiAction={lastAction}
                    errorMessage={errorMessage}
                    aiThought={aiThought}
                    lastTenActions={lastTenActions}
                  />
                </div>
                
                {/* Hidden AIController */}
                <div className="hidden">
                  <AIController 
                    onActionPerformed={(action: GameBoyButton | 'none' | null, thought?: string) => {
                      if (action !== null) { // Ensure action is not null before calling addLastAction
                        addLastAction(action);
                      }
                      if (thought) setAiThought(thought);
                    }}
                    onStatusChange={(newStatus) => setAiEnabled(newStatus === 'Active')}
                    onError={handleErrorMessageChange}
                    enabled={aiEnabled}
                    config={aiConfig}
                    maxTokens={maxTokensForAI}
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* AI Goals Panel - Modal overlay */}
          {aiStatus === 'Active' && !simpleMode && isAIGoalsPanelOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
              <div className="w-full max-w-4xl max-h-[90vh] overflow-auto bg-gray-800 rounded-lg shadow-lg">
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
      </AIProvider> {/* Close AIProvider */}
    </EmulatorProvider>
  );
};

export default App;

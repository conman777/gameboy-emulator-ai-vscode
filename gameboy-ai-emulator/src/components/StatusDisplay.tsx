// StatusDisplay component - Refactored to eliminate ghosting effects
import React from 'react';
import { GameBoyButton } from '../types';
import StablePanel from './StablePanel';

interface StatusDisplayProps {
  romTitle: string | null;
  emulatorStatus: 'Idle' | 'No ROM' | 'Ready' | 'Running' | 'Paused' | 'Error';
  aiStatus: 'Inactive' | 'Active' | 'Error';
  lastAiAction: GameBoyButton | 'none' | null;
  errorMessage: string | null;
  aiThought: string | null;
  lastTenActions?: (GameBoyButton | 'none')[];
}

// Use React.memo with a custom comparison function to prevent unnecessary re-renders
const StatusDisplay: React.FC<StatusDisplayProps> = React.memo(({ 
    romTitle, 
    emulatorStatus, 
    aiStatus, 
    lastAiAction, 
    errorMessage,
    aiThought,
    lastTenActions = []
}) => {  
  return (
    <StablePanel
      title="Status"
      className="bg-gray-700"
      titleClassName="text-lg font-semibold text-white mb-2 p-4 pb-2"
      contentClassName="p-4 pt-0 space-y-2"
    >        <p className="text-sm text-gray-300">
            <span className="font-medium text-gray-100">Game:</span> {romTitle || 'No ROM Loaded'}
        </p>
        <p className="text-sm text-gray-300">
            <span className="font-medium text-gray-100">Emulator:</span> 
            <span className={`ml-1 px-2 py-0.5 rounded text-xs font-semibold ${ 
                emulatorStatus === 'Running' ? 'bg-green-600 text-green-100' : 
                emulatorStatus === 'Ready' || emulatorStatus === 'Paused' ? 'bg-yellow-600 text-yellow-100' : 
                emulatorStatus === 'Error' ? 'bg-red-600 text-red-100' : 
                'bg-gray-500 text-gray-100' 
            }`}>
                {emulatorStatus}
            </span>
        </p>
        <p className="text-sm text-gray-300">
            <span className="font-medium text-gray-100">AI Control:</span> 
            <span className={`ml-1 px-2 py-0.5 rounded text-xs font-semibold ${ 
                aiStatus === 'Active' ? 'bg-green-600 text-green-100' : 
                aiStatus === 'Error' ? 'bg-red-600 text-red-100' : 
                'bg-gray-500 text-gray-100' 
            }`}>
                {aiStatus}
            </span>
        </p>
        {aiStatus === 'Active' && lastAiAction && (
            <p className="text-sm text-gray-300">
                <span className="font-medium text-gray-100">Last AI Action:</span> {lastAiAction === 'none' ? 'None' : lastAiAction.toUpperCase()}
            </p>
        )}
        
        {aiStatus === 'Active' && lastTenActions.length > 0 && (
            <div className="mt-2">
                <p className="text-sm text-gray-300 mb-1">
                    <span className="font-medium text-gray-100">Last 10 AI Actions:</span>
                </p>
                <div className="flex flex-wrap gap-1">
                    {lastTenActions.map((action, index) => (
                        <span 
                            key={index} 
                            className={`px-2 py-1 text-xs font-medium rounded ${
                                action === 'a' ? 'bg-red-700 text-red-200' :
                                action === 'b' ? 'bg-blue-700 text-blue-200' :
                                action === 'start' ? 'bg-purple-700 text-purple-200' :
                                action === 'select' ? 'bg-indigo-700 text-indigo-200' :
                                action === 'none' ? 'bg-gray-700 text-gray-300' :
                                'bg-green-700 text-green-200'
                            }`}
                        >
                            {action.toUpperCase()}
                        </span>
                    ))}
                </div>
            </div>
        )}
        
        {aiStatus === 'Active' && aiThought && (
            <div className="mt-2 border-t border-gray-600 pt-2">
                <p className="text-sm text-gray-300">
                    <span className="font-medium text-gray-100">AI Thought Process:</span>
                </p>
                <p className="text-sm text-indigo-300 bg-gray-800 p-2 rounded mt-1 italic">
                    "{aiThought}"
                </p>
            </div>
        )}
        
        {errorMessage && (
            <p className="text-sm text-red-400 mt-2 border-t border-gray-600 pt-2">
                <span className="font-medium text-red-300">Error:</span> {errorMessage}
            </p>
        )}
    </StablePanel>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.romTitle === nextProps.romTitle &&
    prevProps.emulatorStatus === nextProps.emulatorStatus &&
    prevProps.aiStatus === nextProps.aiStatus &&
    prevProps.lastAiAction === nextProps.lastAiAction &&
    prevProps.errorMessage === nextProps.errorMessage &&
    prevProps.aiThought === nextProps.aiThought &&
    JSON.stringify(prevProps.lastTenActions) === JSON.stringify(nextProps.lastTenActions)
  );
});

export default StatusDisplay;

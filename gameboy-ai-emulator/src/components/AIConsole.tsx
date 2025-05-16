// AIConsole.tsx - A dedicated console to display AI thoughts and allow direct interaction
import React, { useState, useRef, useEffect } from 'react';
import { GameBoyButton } from '../types';

interface AIThoughtEntry {
  timestamp: Date;
  thought: string;
  action: GameBoyButton | 'none' | 'error' | null;
}

interface AIConsoleProps {
  isActive: boolean;
  onSendPrompt: (prompt: string) => void;
  aiThought: string | null;
  lastAction: GameBoyButton | 'none' | null;
}

const AIConsole: React.FC<AIConsoleProps> = ({ 
  isActive, 
  onSendPrompt, 
  aiThought, 
  lastAction 
}) => {
  const [thoughtHistory, setThoughtHistory] = useState<AIThoughtEntry[]>([]);
  const [prompt, setPrompt] = useState('');
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Add new thought to history when aiThought changes
  useEffect(() => {
    if (aiThought && isActive) {
      setThoughtHistory(prev => [
        ...prev,
        {
          timestamp: new Date(),
          thought: aiThought,
          action: lastAction
        }
      ]);
    }
  }, [aiThought, lastAction, isActive]);

  // Scroll to the bottom when new thoughts are added
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [thoughtHistory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onSendPrompt(prompt);
      
      // Add user prompt to history
      setThoughtHistory(prev => [
        ...prev,
        {
          timestamp: new Date(),
          thought: `User: ${prompt}`,
          action: null
        }
      ]);
      
      setPrompt('');
    }
  };

  const clearHistory = () => {
    if (window.confirm('Clear thought history?')) {
      setThoughtHistory([]);
    }
  };

  // Format timestamp for display
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  if (!isActive) return null;
  
  return (
    <div className="w-full bg-gray-800 border border-indigo-800 rounded-lg overflow-hidden shadow-lg">
      <div className="flex items-center justify-between bg-indigo-900 px-4 py-2">
        <h3 className="text-white font-semibold flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          AI Insights
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={clearHistory}
            className="text-xs text-indigo-200 hover:text-white"
            title="Clear history"
          >
            Clear
          </button>
        </div>
      </div>
      
      <div className="overflow-y-auto px-4 py-2 text-sm max-h-60" style={{ backgroundColor: '#1a1a2e' }}>
        {thoughtHistory.length === 0 ? (
          <div className="text-gray-400 italic text-center py-4">
            AI thoughts will appear here when the AI starts analyzing the game...
          </div>
        ) : (
          thoughtHistory.map((entry, index) => (
            <div key={index} className="mb-2 pb-2 border-b border-gray-700">
              <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                <span>{formatTime(entry.timestamp)}</span>
                {entry.action && entry.action !== 'none' && entry.action !== 'error' && (
                  <span className="px-2 py-0.5 bg-indigo-900 text-indigo-200 rounded-full">
                    Action: {entry.action.toUpperCase()}
                  </span>
                )}
              </div>
              <div className={`${entry.thought.startsWith('User:') ? 'text-yellow-300' : 'text-indigo-300'}`}>
                {entry.thought}
              </div>
            </div>
          ))
        )}
        <div ref={consoleEndRef} />
      </div>
      
      <form 
        onSubmit={handleSubmit} 
        className="border-t border-indigo-800 p-2 flex items-center bg-gray-900"
      >
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Send a message to the AI..."
          className="flex-grow px-3 py-2 bg-gray-800 text-white border border-indigo-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          className="ml-2 px-4 py-2 bg-indigo-700 text-white rounded-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          disabled={!prompt.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default AIConsole;

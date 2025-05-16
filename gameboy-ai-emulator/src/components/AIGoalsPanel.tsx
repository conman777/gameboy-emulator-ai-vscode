// AIGoalsPanel.tsx - Component for managing AI goals and system prompts
import React, { useState, useEffect } from 'react';
import {
  getAllGoals,
  getActiveGoal,
  getAllSystemPrompts,
  getActiveSystemPrompt,
  setActiveGoal,
  setActiveSystemPrompt,
  addGoal,
  updateGoalStatus,
  deleteGoal,
  addSystemPrompt,
  updateSystemPrompt,
  deleteSystemPrompt,
} from '../services/AIGoalService';
import { AIGoal, AISystemPrompt } from '../types/index';

interface AIGoalsPanelProps {
  onClose?: () => void;
}

const AIGoalsPanel: React.FC<AIGoalsPanelProps> = ({ onClose }) => {
  const [goals, setGoals] = useState<AIGoal[]>([]);
  const [systemPrompts, setSystemPrompts] = useState<AISystemPrompt[]>([]);
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
  const [activePromptId, setActivePromptId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'goals' | 'prompts'>('goals');
  
  // Form states for creating new items
  const [newGoal, setNewGoal] = useState({
    description: '',
    type: 'user-defined' as AIGoal['type'],
    additionalContext: ''
  });
  
  const [newPrompt, setNewPrompt] = useState({
    name: '',
    description: '',
    content: ''
  });
  
  // Load data on mount
  useEffect(() => {
    refreshData();
  }, []);
  
  const refreshData = () => {
    setGoals(getAllGoals());
    setSystemPrompts(getAllSystemPrompts());
    
    const activeGoal = getActiveGoal();
    setActiveGoalId(activeGoal?.id || null);
    
    const activePrompt = getActiveSystemPrompt();
    setActivePromptId(activePrompt?.id || '');
  };
  
  // Handle changes to active goal/prompt
  const handleSetActiveGoal = (goalId: string | null) => {
    const success = setActiveGoal(goalId);
    if (success) {
      setActiveGoalId(goalId);
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('aiGoalUpdated'));
    }
  };
  
  const handleSetActivePrompt = (promptId: string) => {
    const success = setActiveSystemPrompt(promptId);
    if (success) {
      setActivePromptId(promptId);
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('aiSystemPromptUpdated'));
    }
  };
  
  // Handle creating new goals
  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.description.trim()) return;
    
    const goal = addGoal({
      description: newGoal.description,
      type: newGoal.type,
      additionalContext: newGoal.additionalContext.trim() || undefined
    });
    
    // Reset form and refresh
    setNewGoal({
      description: '',
      type: 'user-defined' as AIGoal['type'],
      additionalContext: ''
    });
    refreshData();
  };
  
  // Handle creating new system prompts
  const handleAddPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrompt.name.trim() || !newPrompt.content.trim()) return;
    
    const prompt = addSystemPrompt({
      name: newPrompt.name,
      description: newPrompt.description,
      content: newPrompt.content,
      isDefault: false
    });
    
    // Reset form and refresh
    setNewPrompt({
      name: '',
      description: '',
      content: ''
    });
    refreshData();
  };
  
  // Handle goal status updates
  const handleUpdateGoalStatus = (goalId: string, status: AIGoal['status']) => {
    const updated = updateGoalStatus(goalId, status);
    if (updated) {
      refreshData();
    }
  };
  
  // Handle deleting goals/prompts
  const handleDeleteGoal = (goalId: string) => {
    const success = deleteGoal(goalId);
    if (success) {
      refreshData();
    }
  };
  
  const handleDeletePrompt = (promptId: string) => {
    const success = deleteSystemPrompt(promptId);
    if (success) {
      refreshData();
    }
  };
  
  return (
    <div className="p-4 bg-gray-800 text-white rounded-lg shadow-lg max-w-3xl mx-auto h-full overflow-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">AI Goals & System Prompts</h2>
        {onClose && (
          <button 
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-700"
          >
            ✕
          </button>
        )}
      </div>
      
      {/* Tab Navigation */}
      <div className="flex mb-4 border-b border-gray-700">
        <button
          className={`py-2 px-4 ${activeTab === 'goals' ? 'border-b-2 border-blue-400' : ''}`}
          onClick={() => setActiveTab('goals')}
        >
          Goals
        </button>
        <button
          className={`py-2 px-4 ${activeTab === 'prompts' ? 'border-b-2 border-blue-400' : ''}`}
          onClick={() => setActiveTab('prompts')}
        >
          System Prompts
        </button>
      </div>
      
      {/* Goals Tab */}
      {activeTab === 'goals' && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Current Goals</h3>
          {goals.length === 0 ? (
            <p className="text-gray-400 italic">No goals defined. Create one below.</p>
          ) : (
            <ul className="mb-4 space-y-2">
              {goals.map(goal => (
                <li 
                  key={goal.id} 
                  className={`p-3 rounded ${
                    goal.id === activeGoalId 
                      ? 'bg-blue-700' 
                      : goal.status === 'completed'
                        ? 'bg-green-800'
                        : goal.status === 'failed'
                          ? 'bg-red-800' 
                          : 'bg-gray-700'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{goal.description}</p>
                      <p className="text-sm text-gray-400">
                        {goal.type === 'high-level' ? 'High-level goal' : 'User-defined goal'} · 
                        {goal.status}
                      </p>
                      {goal.additionalContext && (
                        <p className="text-sm text-gray-300 mt-1">
                          <strong>Context:</strong> {goal.additionalContext}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSetActiveGoal(goal.id)}
                        className={`px-2 py-1 text-xs rounded ${
                          goal.id === activeGoalId 
                            ? 'bg-blue-500' 
                            : 'bg-blue-600 hover:bg-blue-500'
                        }`}
                      >
                        {goal.id === activeGoalId ? 'Active' : 'Make Active'}
                      </button>
                      
                      {goal.status === 'active' && (
                        <>
                          <button
                            onClick={() => handleUpdateGoalStatus(goal.id, 'completed')}
                            className="px-2 py-1 text-xs rounded bg-green-600 hover:bg-green-500"
                          >
                            Complete
                          </button>
                          <button
                            onClick={() => handleUpdateGoalStatus(goal.id, 'failed')}
                            className="px-2 py-1 text-xs rounded bg-red-600 hover:bg-red-500"
                          >
                            Failed
                          </button>
                        </>
                      )}
                      
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="px-2 py-1 text-xs rounded bg-gray-600 hover:bg-gray-500"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          
          {/* Clear active goal button */}
          {activeGoalId && (
            <button
              onClick={() => handleSetActiveGoal(null)}
              className="mb-4 px-3 py-1 text-sm rounded bg-gray-700 hover:bg-gray-600"
            >
              Clear Active Goal
            </button>
          )}
          
          {/* Add new goal form */}
          <h3 className="text-lg font-semibold mb-2">Add New Goal</h3>
          <form onSubmit={handleAddGoal} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Goal Description
              </label>
              <input
                type="text"
                value={newGoal.description}
                onChange={e => setNewGoal({...newGoal, description: e.target.value})}
                className="w-full p-2 rounded bg-gray-700 text-white"
                placeholder="Enter goal description..."
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Goal Type
              </label>
              <select
                value={newGoal.type}
                onChange={e => setNewGoal({...newGoal, type: e.target.value as AIGoal['type']})}
                className="w-full p-2 rounded bg-gray-700 text-white"
              >
                <option value="high-level">High-level</option>
                <option value="user-defined">User-defined</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Additional Context (Optional)
              </label>
              <textarea
                value={newGoal.additionalContext}
                onChange={e => setNewGoal({...newGoal, additionalContext: e.target.value})}
                className="w-full p-2 rounded bg-gray-700 text-white"
                placeholder="Add any context that will help the AI achieve this goal..."
                rows={3}
              />
            </div>
            
            <button
              type="submit"
              className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500"
            >
              Add Goal
            </button>
          </form>
        </div>
      )}
      
      {/* System Prompts Tab */}
      {activeTab === 'prompts' && (
        <div>
          <h3 className="text-lg font-semibold mb-2">System Prompts</h3>
          {systemPrompts.length === 0 ? (
            <p className="text-gray-400 italic">No system prompts defined.</p>
          ) : (
            <ul className="mb-4 space-y-2">
              {systemPrompts.map(prompt => (
                <li 
                  key={prompt.id} 
                  className={`p-3 rounded ${
                    prompt.id === activePromptId 
                      ? 'bg-blue-700' 
                      : 'bg-gray-700'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{prompt.name}</p>
                      <p className="text-sm text-gray-400">
                        {prompt.description}
                        {prompt.isDefault && ' · Default'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSetActivePrompt(prompt.id)}
                        className={`px-2 py-1 text-xs rounded ${
                          prompt.id === activePromptId 
                            ? 'bg-blue-500' 
                            : 'bg-blue-600 hover:bg-blue-500'
                        }`}
                      >
                        {prompt.id === activePromptId ? 'Active' : 'Make Active'}
                      </button>
                      
                      {!prompt.isDefault && (
                        <button
                          onClick={() => handleDeletePrompt(prompt.id)}
                          className="px-2 py-1 text-xs rounded bg-gray-600 hover:bg-gray-500"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Collapsible preview */}
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
                      Show prompt content
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-900 rounded text-xs overflow-x-auto whitespace-pre-wrap">
                      {prompt.content}
                    </pre>
                  </details>
                </li>
              ))}
            </ul>
          )}
          
          {/* Add new system prompt form */}
          <h3 className="text-lg font-semibold mb-2">Add New System Prompt</h3>
          <form onSubmit={handleAddPrompt} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Prompt Name
              </label>
              <input
                type="text"
                value={newPrompt.name}
                onChange={e => setNewPrompt({...newPrompt, name: e.target.value})}
                className="w-full p-2 rounded bg-gray-700 text-white"
                placeholder="Enter prompt name..."
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Description
              </label>
              <input
                type="text"
                value={newPrompt.description}
                onChange={e => setNewPrompt({...newPrompt, description: e.target.value})}
                className="w-full p-2 rounded bg-gray-700 text-white"
                placeholder="Enter a short description..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Prompt Content
              </label>
              <textarea
                value={newPrompt.content}
                onChange={e => setNewPrompt({...newPrompt, content: e.target.value})}
                className="w-full p-2 rounded bg-gray-700 text-white"
                placeholder="Enter the system prompt content..."
                rows={6}
                required
              />
            </div>
            
            <button
              type="submit"
              className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500"
            >
              Add System Prompt
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AIGoalsPanel;

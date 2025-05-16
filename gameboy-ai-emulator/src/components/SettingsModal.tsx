// filepath: c:/Users/conor/Documents/Coding projects/gameboy emulator/gameboy-ai-emulator/src/components/SettingsModal.tsx
import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMaxTokens: number;
  onSave: (newMaxTokens: number) => void;
  simpleMode: boolean;
  onSimpleModeChange: (enabled: boolean) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentMaxTokens,
  onSave,
  simpleMode,
  onSimpleModeChange,
}) => {
  const [maxTokens, setMaxTokens] = useState(currentMaxTokens);
  const [localSimpleMode, setLocalSimpleMode] = useState(simpleMode);

  useEffect(() => {
    setMaxTokens(currentMaxTokens);
  }, [currentMaxTokens, isOpen]);

  useEffect(() => {
    setLocalSimpleMode(simpleMode);
  }, [simpleMode, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    onSave(maxTokens);
    onSimpleModeChange(localSimpleMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-4 text-indigo-300">AI Settings</h2>
        
        <div className="mb-4">
          <label htmlFor="maxTokens" className="block text-sm font-medium text-gray-300 mb-1">
            Max Tokens for AI Action:
          </label>
          <input
            type="number"
            id="maxTokens"
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
            className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 focus:ring-indigo-500 focus:border-indigo-500"
            min="50"
            step="10"
          />
          <p className="text-xs text-gray-400 mt-1">
            Controls how long the AI can "think" for its main actions. Higher values allow more complex reasoning but can be slower and cost more. Default: 300.
          </p>
        </div>

        <div className="mb-4">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={localSimpleMode}
              onChange={(e) => setLocalSimpleMode(e.target.checked)}
              className="form-checkbox h-5 w-5 text-indigo-600"
            />
            <span className="ml-2 text-gray-300 font-medium">Enable Simple Mode</span>
          </label>
          <p className="text-xs text-gray-400 mt-1">
            Simple Mode hides advanced AI and navigation features for a cleaner, easier interface.
          </p>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-white"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;

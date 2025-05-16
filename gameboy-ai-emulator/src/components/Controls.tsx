import React, { useState, useRef, useCallback, useEffect } from "react";
import { useEmulator } from "../context/EmulatorContext";

// Define the props interface
interface ControlsProps {
  onStatusChange?: (status: 'Idle' | 'No ROM' | 'Ready' | 'Running' | 'Paused' | 'Error') => void;
  onRomTitleChange?: (title: string | null) => void;
  onError?: (error: string | null) => void;
}

interface SavedState {
  id: string;
  name: string;
  date: Date;
}

const Controls: React.FC<ControlsProps> = ({ 
  onStatusChange, 
  onRomTitleChange, 
  onError 
}) => {
  const emulator = useEmulator();
  const [romLoaded, setRomLoaded] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<string>("No ROM Loaded");
  const [romFile, setRomFile] = useState<File | null>(null);
  
  // State for save/load functionality
  const [savedStates, setSavedStates] = useState<SavedState[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveStateName, setSaveStateName] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Helper to update status in both state and via callback
  const updateStatus = (newStatus: 'Idle' | 'No ROM' | 'Ready' | 'Running' | 'Paused' | 'Error') => {
    setStatus(newStatus);
    if (onStatusChange) onStatusChange(newStatus);
  };
  
  // Load saved states from localStorage on component mount
  useEffect(() => {
    try {
      const savedStatesJson = localStorage.getItem('gameSavedStates');
      if (savedStatesJson) {
        const parsedStates = JSON.parse(savedStatesJson);
        setSavedStates(parsedStates.map((state: any) => ({
          ...state,
          date: new Date(state.date)
        })));
      }
    } catch (error) {
      console.error('Error loading saved states:', error);
    }
  }, []);
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !emulator) return;
    
    setRomFile(file);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await emulator.loadROM(arrayBuffer);
      
      if (result.success) {
        setRomLoaded(true);
        setStatus(`Loaded: ${result.title || file.name}`);
        if (onRomTitleChange) onRomTitleChange(result.title || file.name);
        updateStatus('Ready');
        if (onError) onError(null); // Clear any previous errors
      } else {
        setRomLoaded(false);
        setStatus(result.message || "Failed to load ROM");
        if (onRomTitleChange) onRomTitleChange(null);
        updateStatus('Error');
        if (onError) onError(result.message || "Failed to load ROM");
      }
    } catch (err: any) {
      setRomLoaded(false);
      setStatus("Error loading ROM");
      if (onRomTitleChange) onRomTitleChange(null);
      updateStatus('Error');
      if (onError) onError(err.message || "Error loading ROM");
    }
    
    setIsRunning(false);
  };
  const handleStart = () => {
    if (!romLoaded || !emulator) return;
    
    emulator.start();
    setIsRunning(true);
    setStatus("Running");
    updateStatus('Running');
  };

  const handlePause = () => {
    if (!emulator) return;
    
    emulator.stop();
    setIsRunning(false);
    setStatus("Paused");
    updateStatus('Paused');
  };
  
  // Function to handle saving game state
  const handleSaveState = useCallback(async () => {
    if (!emulator || !isRunning) {
      if (onError) onError("Cannot save: Emulator not running");
      return;
    }
    
    try {
      setShowSaveDialog(true);
    } catch (error: any) {
      console.error("Error preparing to save state:", error);
      if (onError) onError(error.message || "Error preparing to save state");
    }
  }, [emulator, isRunning, onError]);
  
  // Function to handle saving the state after naming it
  const handleSaveConfirm = useCallback(async () => {
    if (!emulator) return;
    
    try {
      // Get the save state data
      const saveData = await emulator.saveState();
      
      // Create a unique ID for this save
      const saveId = Date.now().toString();
      
      // Create the save state object
      const saveState: SavedState = {
        id: saveId,
        name: saveStateName || `Save ${savedStates.length + 1}`,
        date: new Date()
      };
      
      // Add to saved states
      const newSavedStates = [...savedStates, saveState];
      setSavedStates(newSavedStates);
      
      // Save to localStorage
      localStorage.setItem(`gameState_${saveId}`, saveData);
      localStorage.setItem('gameSavedStates', JSON.stringify(newSavedStates));
      
      // Close dialog and reset input
      setShowSaveDialog(false);
      setSaveStateName('');
      
      // Show success message
      if (onError) {
        onError("Game saved successfully!");
        setTimeout(() => onError(null), 3000);
      }
    } catch (error: any) {
      console.error("Error saving state:", error);
      if (onError) onError(error.message || "Error saving game state");
    }
  }, [emulator, saveStateName, savedStates, onError]);
  
  // Function to handle loading a saved state
  const handleLoadState = useCallback((saveId: string) => async () => {
    if (!emulator || !romLoaded) {
      if (onError) onError("Cannot load: No ROM loaded or emulator not available");
      return;
    }
    
    try {
      // Get the save data from localStorage
      const saveData = localStorage.getItem(`gameState_${saveId}`);
      if (!saveData) {
        throw new Error("Save data not found");
      }
      
      // Load the state
      const success = await emulator.loadState(saveData);
      
      if (success) {
        // Update emulator status
        setIsRunning(true);
        updateStatus('Running');
        
        // Show success message
        if (onError) {
          onError("Game state loaded successfully!");
          setTimeout(() => onError(null), 3000);
        }
      } else {
        throw new Error("Failed to load save state");
      }
    } catch (error: any) {
      console.error("Error loading state:", error);
      if (onError) onError(error.message || "Error loading game state");
    }
  }, [emulator, romLoaded, onError, updateStatus]);
  
  // Function to delete a saved state
  const handleDeleteSave = useCallback((saveId: string) => {
    // Remove from localStorage
    localStorage.removeItem(`gameState_${saveId}`);
    
    // Update saved states list
    const newSavedStates = savedStates.filter(state => state.id !== saveId);
    setSavedStates(newSavedStates);
    localStorage.setItem('gameSavedStates', JSON.stringify(newSavedStates));
  }, [savedStates]);
  return (
    <div className="flex flex-col items-center gap-4 p-5 bg-gray-800 rounded-lg shadow-lg w-full max-w-md">
      <div className="w-full flex flex-col">
        <label 
          htmlFor="rom-file" 
          className="mb-2 text-sm font-medium text-indigo-300"
        >
          Select ROM File (.gb)
        </label>
        
        <div className="relative">
          <input
            id="rom-file"
            type="file"
            accept=".gb"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-300 
                      file:mr-4 file:py-2 file:px-4 
                      file:rounded-lg file:border-0
                      file:text-sm file:font-semibold
                      file:bg-indigo-600 file:text-white
                      hover:file:bg-indigo-700
                      focus:outline-none"
            ref={fileInputRef}
          />
        </div>
      </div>

      <div className="flex justify-center gap-4 w-full">
        <button
          className={`px-6 py-2 rounded-lg font-medium transition-colors
                    ${!romLoaded || isRunning 
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                      : 'bg-green-600 text-white hover:bg-green-700'}`}
          onClick={handleStart}
          disabled={!romLoaded || isRunning}
        >
          Start
        </button>
        <button
          className={`px-6 py-2 rounded-lg font-medium transition-colors
                    ${!isRunning 
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                      : 'bg-yellow-600 text-white hover:bg-yellow-700'}`}
          onClick={handlePause}
          disabled={!isRunning}
        >
          Pause
        </button>
        <button
          className={`px-6 py-2 rounded-lg font-medium transition-colors
                    ${!isRunning 
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          onClick={handleSaveState}
          disabled={!isRunning}
        >
          Save
        </button>
      </div>
      
      <div className="mt-2 text-sm text-gray-400">{status}</div>
      
      {/* Saved Games Section */}
      {savedStates.length > 0 && (
        <div className="w-full mt-4">
          <h3 className="text-md font-semibold text-indigo-300 mb-2">Saved Games</h3>
          <div className="bg-gray-700 rounded-lg p-2 max-h-60 overflow-y-auto">
            {savedStates.map((save) => (
              <div key={save.id} className="flex justify-between items-center p-2 border-b border-gray-600">
                <div>
                  <div className="text-sm font-medium text-white">{save.name}</div>
                  <div className="text-xs text-gray-400">{save.date.toLocaleString()}</div>
                </div>
                <div className="flex space-x-2">
                  <button
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs"
                    onClick={handleLoadState(save.id)}
                  >
                    Load
                  </button>
                  <button
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs"
                    onClick={() => handleDeleteSave(save.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full">
            <h3 className="text-xl font-bold mb-4 text-white">Save Game State</h3>
            <div className="mb-4">
              <label className="block mb-2 text-gray-300">Save Name</label>
              <input 
                type="text"
                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-white"
                placeholder="Enter a name for this save"
                value={saveStateName}
                onChange={e => setSaveStateName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-4">
              <button 
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                onClick={() => setShowSaveDialog(false)}
              >
                Cancel
              </button>
              <button 
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                onClick={handleSaveConfirm}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Controls;

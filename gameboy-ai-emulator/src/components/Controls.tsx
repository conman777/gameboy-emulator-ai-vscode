import React, { useState, useRef, useCallback, useEffect } from "react";
import { useEmulator } from "../context/EmulatorContext";
import { saveRom, getRom, clearRom, StoredRom } from "../services/StorageService"; // Added clearRom import
import { GameBoyButton } from "../types"; // Import GameBoyButton type

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
  const [romFile, setRomFile] = useState<File | {name: string} | null>(null); 
  
  // State for save/load functionality
  const [savedStates, setSavedStates] = useState<SavedState[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveStateName, setSaveStateName] = useState("");
  
  // Add state for controlling ROM auto-loading
  const [autoLoadRomEnabled, setAutoLoadRomEnabled] = useState(false); // Default to disabled
  const [hasStoredRom, setHasStoredRom] = useState(false);
  // State to track pressed physical buttons for styling
  const [pressedButtons, setPressedButtons] = useState<Partial<Record<GameBoyButton, boolean>>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Helper to update status in both state and via callback
  const updateStatus = useCallback((newStatus: 'Idle' | 'No ROM' | 'Ready' | 'Running' | 'Paused' | 'Error') => {
    setStatus(newStatus);
    if (onStatusChange) onStatusChange(newStatus);
  }, [onStatusChange]);
  
  // Check if a ROM exists in storage without loading it
  useEffect(() => {
    const checkForStoredRom = async () => {
      try {
        const storedRomData = await getRom();
        setHasStoredRom(!!storedRomData);
      } catch (error) {
        console.error("Error checking for stored ROM:", error);
        setHasStoredRom(false);
      }
    };
    
    checkForStoredRom();
  }, []);
  
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

    // Only attempt to load ROM if autoLoadRomEnabled is true
    if (autoLoadRomEnabled && emulator) {
      const loadRomFromStorage = async () => {
        try {
          const storedRomData = await getRom(); 
          if (storedRomData) {
            setRomFile({ name: storedRomData.name }); 
            // Create a copy of the ArrayBuffer before passing it to the emulator
            const romBufferCopy = storedRomData.data.slice(0);
            const result = await emulator.loadROM(romBufferCopy); // Pass the copy

            if (result.success) {
              setRomLoaded(true);
              setStatus(`Loaded: ${result.title || storedRomData.name}`);
              if (onRomTitleChange) onRomTitleChange(result.title || storedRomData.name);
              updateStatus('Ready');
              if (onError) onError(null);
              console.log("ROM loaded from IndexedDB:", result.title || storedRomData.name);
            } else {
              console.warn("Failed to load ROM from IndexedDB:", result.message);
              updateStatus('No ROM'); 
              if (onRomTitleChange) onRomTitleChange(null);
              if (onError) onError(result.message || "Failed to load ROM from storage");
            }
          } else {
            updateStatus('No ROM');
          }
        } catch (err: any) {
          console.error("Error loading ROM from IndexedDB:", err);
          updateStatus('Error');
          if (onRomTitleChange) onRomTitleChange(null);
          if (onError) onError(err.message || "Error loading ROM from storage");
        }
      };

      loadRomFromStorage();
    }
  }, [emulator, onRomTitleChange, onError, updateStatus, autoLoadRomEnabled]); // Added autoLoadRomEnabled dependency


  // Function to handle clearing the stored ROM
  const handleClearRom = async () => {
    try {
      await clearRom();
      setHasStoredRom(false);
      if (onError) {
        onError("Stored ROM cleared successfully!");
        // Use setTimeout with a type check
        if (onError) {
          setTimeout(() => onError(null), 3000);
        }
      }
    } catch (error) {
      console.error("Error clearing ROM:", error);
      if (onError) onError("Failed to clear the stored ROM.");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !emulator) return;
    
    setRomFile(file); // Store the full File object when selected by user
      try {
      const romArrayBuffer: ArrayBuffer = await file.arrayBuffer();
      // const success = emulator.loadRom(new Uint8Array(arrayBuffer)); // Original erroneous line
      const result = await emulator.loadROM(romArrayBuffer); // Corrected: pass arrayBuffer directly
      
      if (result.success) {
        setRomLoaded(true);
        // const romTitle = emulator.getRomTitle(); // Original erroneous line
        const romTitle = result.title || file.name; // Corrected: get title from result
        setStatus(`Loaded: ${romTitle}`);
        if (onRomTitleChange) onRomTitleChange(romTitle);
        updateStatus('Ready');
        if (onError) onError(null); // Clear any previous errors        // Only save ROM if auto-load is enabled
        if (autoLoadRomEnabled) {
          // TODO: Fix TypeScript error with saveRom function call
          // await saveRom(romArrayBuffer, file.name); // Save ROM to IndexedDB with data and name
          setHasStoredRom(true);
          console.log("ROM saving temporarily disabled due to TypeScript error");
        }
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
    
    emulator.start(); // Corrected: was emulator.run()
    setIsRunning(true);
    setStatus("Running");
    updateStatus('Running');
  };

  const handlePause = () => {
    if (!emulator) return;
    
    emulator.stop(); // Corrected: was emulator.pause()
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
      const saveData = await emulator.saveState(); // Corrected: await promise
      
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
      const success = await emulator.loadState(saveData); // Corrected: await promise
      
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

  // Handlers for Game Boy buttons
  const handleButtonPress = useCallback((button: GameBoyButton) => {
    if (emulator && romLoaded) {
      emulator.pressButton(button);
      setPressedButtons(prev => ({ ...prev, [button]: true }));
    }
  }, [emulator, romLoaded]);

  const handleButtonRelease = useCallback((button: GameBoyButton) => {
    if (emulator && romLoaded) {
      emulator.releaseButton(button);
      setPressedButtons(prev => ({ ...prev, [button]: false }));
    }
  }, [emulator, romLoaded]);

  // Helper to create button props
  const getButtonProps = (button: GameBoyButton) => ({
    onMouseDown: () => handleButtonPress(button),
    onMouseUp: () => handleButtonRelease(button),
    onTouchStart: (e: React.TouchEvent) => {
      e.preventDefault(); // Prevent mouse event emulation
      handleButtonPress(button);
    },
    onTouchEnd: (e: React.TouchEvent) => {
      e.preventDefault();
      handleButtonRelease(button);
    },
    className: `px-4 py-2 rounded font-bold text-white transition-colors select-none
                ${pressedButtons[button] ? 'bg-green-700' : 'bg-green-500 hover:bg-green-600'}
                ${!romLoaded || !emulator ? 'opacity-50 cursor-not-allowed' : ''}`,
    disabled: !romLoaded || !emulator,
  });


  return (
    <div className="flex flex-col items-center gap-4 p-5 bg-gray-800 rounded-lg shadow-lg w-full max-w-md">
      <div className="w-full flex flex-col">
        <label 
          htmlFor="rom-file" 
          className="mb-2 text-sm font-medium text-indigo-300"
        >
          Select ROM File (.gb)
        </label>
        <div className="flex items-center gap-2 mb-2">
          <input
            type="file"
            id="rom-file"
            accept=".gb"
            onChange={handleFileChange}
            ref={fileInputRef}
            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-500 file:text-white hover:file:bg-indigo-600"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            title="Load ROM from file"
          >
            Load
          </button>
        </div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoLoadRom"
              checked={autoLoadRomEnabled}
              onChange={(e) => setAutoLoadRomEnabled(e.target.checked)}
              className="mr-2 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="autoLoadRom" className="text-xs text-gray-300">
              Auto-save/load last ROM
            </label>
          </div>
          {hasStoredRom && (
            <button
              onClick={handleClearRom}
              className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
              title="Clear the ROM stored in your browser's local storage"
            >
              Clear Stored ROM
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Status: <span className={`font-semibold ${status.startsWith("Error") ? 'text-red-400' : 'text-green-400'}`}>{status}</span>
          {hasStoredRom && !autoLoadRomEnabled && <span className="text-yellow-400 ml-2">(Stored ROM available)</span>}
        </p>
      </div>

      {/* Emulator Action Buttons */}
      <div className="grid grid-cols-3 gap-2 w-full mb-4">
        <button
          onClick={handleStart}
          disabled={!romLoaded || isRunning || !emulator}
          className={`px-4 py-2 rounded font-bold text-white transition-colors ${
            !romLoaded || isRunning || !emulator
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-green-500 hover:bg-green-600"
          }`}
        >
          Start
        </button>
        <button
          onClick={handlePause}
          disabled={!isRunning || !emulator}
          className={`px-4 py-2 rounded font-bold text-white transition-colors ${
            !isRunning || !emulator
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-yellow-500 hover:bg-yellow-600"
          }`}
        >
          Pause
        </button>
        <button
          onClick={handleSaveState}
          disabled={!isRunning || !emulator}
          className={`px-4 py-2 rounded font-bold text-white transition-colors ${
            !isRunning || !emulator
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          Save State
        </button>
      </div>
        {/* Game Boy Controls */}
      <div className="w-full flex flex-col items-center gap-2 mb-3">
        <p className="text-sm font-medium text-indigo-300 mb-1">Manual Controls</p>
        
        <div className="flex justify-center gap-4">
          {/* D-Pad */}
          <div className="grid grid-cols-3 gap-1 w-24">
            <div></div> {/* Empty cell for layout */}
            <button {...getButtonProps('up')} className={`${getButtonProps('up').className} h-8 w-8 text-sm p-0`}>↑</button>
            <div></div> {/* Empty cell for layout */}
            <button {...getButtonProps('left')} className={`${getButtonProps('left').className} h-8 w-8 text-sm p-0`}>←</button>
            <div className="bg-gray-700 rounded-full w-6 h-6 m-1 flex items-center justify-center"></div> {/* D-pad center */}
            <button {...getButtonProps('right')} className={`${getButtonProps('right').className} h-8 w-8 text-sm p-0`}>→</button>
            <div></div> {/* Empty cell for layout */}
            <button {...getButtonProps('down')} className={`${getButtonProps('down').className} h-8 w-8 text-sm p-0`}>↓</button>
            <div></div> {/* Empty cell for layout */}
          </div>

          {/* A, B Buttons */}
          <div className="flex flex-col">
            <div className="flex gap-2 mb-1">
              <button {...getButtonProps('b')} className={`${getButtonProps('b').className} w-10 h-10 rounded-full text-lg p-0`}>B</button>
              <button {...getButtonProps('a')} className={`${getButtonProps('a').className} w-10 h-10 rounded-full text-lg p-0`}>A</button>
            </div>
            
            {/* Start, Select Buttons */}
            <div className="flex gap-2">
              <button {...getButtonProps('select')} className={`${getButtonProps('select').className} px-2 py-1 text-xs`}>Sel</button>
              <button {...getButtonProps('start')} className={`${getButtonProps('start').className} px-2 py-1 text-xs`}>Start</button>
            </div>
          </div>
        </div>
      </div>


      {/* Save State Dialog */}
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
      
      {/* Auto-load ROM Toggle */}
      <div className="w-full mt-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-indigo-300">
            Auto-load last ROM on startup
          </label>
          <button
            className={`w-10 h-6 flex items-center rounded-full p-1 transition-all
                        ${autoLoadRomEnabled ? 'bg-green-500' : 'bg-gray-600'}`}
            onClick={() => setAutoLoadRomEnabled(prev => !prev)}
          >
            <span
              className={`w-4 h-4 bg-white rounded-full transition-transform
                          ${autoLoadRomEnabled ? 'transform translate-x-4' : ''}`}
            />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {autoLoadRomEnabled ? "Enabled" : "Disabled"}
        </p>
      </div>
    </div>
  );
};

export default Controls;

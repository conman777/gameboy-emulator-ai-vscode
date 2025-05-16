// NavigationPanel.tsx - Component for displaying and managing grid-based navigation features
import React, { useState, useEffect, useRef } from 'react';
import { 
  DEFAULT_GRID, 
  getLocationNames, 
  findPathBetweenLocations, 
  registerLocation,
  deleteLocation,
  getFrequentPaths,
  recordPathUse,
  drawGridOverlay,
  NavigationInstruction,
  SavedPath
} from '../services/GridNavigationService';
import { GameBoyButton } from '../types';

interface NavigationPanelProps {
  onRequestNavigate: (instructions: NavigationInstruction[]) => void;
  isNavigating: boolean;
  progress: {
    current: number;
    total: number;
    currentAction: NavigationInstruction | null;
  };
  screenCapture?: string | null;
  onScreenCaptureRequest?: () => Promise<string | null>;
  onDetectPlayerPosition?: () => Promise<{x: number, y: number, confidence: number} | null>;
  onAnalyzeGridLocation?: (x: number, y: number) => Promise<string | null>;
}

const NavigationPanel: React.FC<NavigationPanelProps> = ({ 
  onRequestNavigate, 
  isNavigating,
  progress,
  screenCapture,
  onScreenCaptureRequest,
  onDetectPlayerPosition,
  onAnalyzeGridLocation
}) => {
  const [startPoint, setStartPoint] = useState<string>('');
  const [endPoint, setEndPoint] = useState<string>('');
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [newLocationName, setNewLocationName] = useState<string>('');
  const [newLocationX, setNewLocationX] = useState<string>('0');
  const [newLocationY, setNewLocationY] = useState<string>('0');
  const [gridCoordinates, setGridCoordinates] = useState<{x: number, y: number} | null>(null);
  const [frequentPaths, setFrequentPaths] = useState<SavedPath[]>([]);
  const [locationDescription, setLocationDescription] = useState<string | null>(null);
  
  // Canvas refs for grid overlay
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  
  // Load available locations on mount
  useEffect(() => {
    loadLocations();
    
    // Update frequent paths
    setFrequentPaths(getFrequentPaths());
  }, []);

  // Update grid overlay when showing or when screenCapture changes
  useEffect(() => {
    if (showGrid && screenCapture && overlayCanvasRef.current) {
      const canvas = overlayCanvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        drawGridOverlay(ctx, canvas.width, canvas.height);
      }
    }
  }, [showGrid, screenCapture]);
  
  const loadLocations = () => {
    // Get location names
    setAvailableLocations(getLocationNames());
  };
  
  const handleNavigateClick = () => {
    if (!startPoint || !endPoint || isNavigating) return;
    
    const instructions = findPathBetweenLocations(startPoint, endPoint);
    
    if (instructions && instructions.length > 0) {
      // Record this path as frequently used
      recordPathUse(startPoint, endPoint);
      
      // Refresh frequent paths
      setFrequentPaths(getFrequentPaths());
      
      // Request navigation
      onRequestNavigate(instructions);
    } else {
      alert(`No path found between ${startPoint} and ${endPoint}`);
    }
  };

  // Handle frequent path selection
  const handleFrequentPathClick = (path: SavedPath) => {
    setStartPoint(path.startName);
    setEndPoint(path.endName);
  };
  
  // Toggle grid overlay
  const toggleGridOverlay = () => {
    setShowGrid(!showGrid);
    
    if (!showGrid && onScreenCaptureRequest) {
      onScreenCaptureRequest();
    }
  };
  
  // Handle click on overlay to get coordinates
  const handleOverlayClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    
    // Calculate the scaling factor between canvas coordinate space and displayed size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Get click position in canvas coordinate space
    const x = Math.floor(((e.clientX - rect.left) * scaleX) / DEFAULT_GRID.cellPixelWidth);
    const y = Math.floor(((e.clientY - rect.top) * scaleY) / DEFAULT_GRID.cellPixelHeight);
    
    // Clamp values to grid boundaries
    const clampedX = Math.max(0, Math.min(DEFAULT_GRID.width - 1, x));
    const clampedY = Math.max(0, Math.min(DEFAULT_GRID.height - 1, y));
    
    setGridCoordinates({ x: clampedX, y: clampedY });
    setNewLocationX(clampedX.toString());
    setNewLocationY(clampedY.toString());
    setLocationDescription(null);
  };
  
  // Add a new location
  const handleAddLocation = () => {
    if (!newLocationName || newLocationName.trim() === '') {
      alert('Please enter a location name');
      return;
    }
    
    const x = parseInt(newLocationX, 10);
    const y = parseInt(newLocationY, 10);
    
    if (isNaN(x) || isNaN(y)) {
      alert('Invalid coordinates');
      return;
    }
    
    // Register the location
    registerLocation(newLocationName.trim(), x, y);
    
    // Refresh locations list
    loadLocations();
    
    // Clear form
    setNewLocationName('');
    
    // Refresh canvas
    if (overlayCanvasRef.current) {
      const canvas = overlayCanvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        drawGridOverlay(ctx, canvas.width, canvas.height);
      }
    }
  };
  
  // Handle deletion of a location
  const handleDeleteLocation = (locationName: string) => {
    if (window.confirm(`Are you sure you want to delete the location "${locationName}"?`)) {
      deleteLocation(locationName);
      loadLocations();
      
      // Also update start/end points if they match the deleted location
      if (startPoint === locationName) setStartPoint('');
      if (endPoint === locationName) setEndPoint('');
      
      // Refresh canvas
      if (overlayCanvasRef.current) {
        const canvas = overlayCanvasRef.current;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          drawGridOverlay(ctx, canvas.width, canvas.height);
        }
      }
    }
  };
  
  // Handle click to analyze what's at a specific grid location
  const handleAnalyzeLocation = async () => {
    if (!gridCoordinates || !onAnalyzeGridLocation) return;
    
    const description = await onAnalyzeGridLocation(gridCoordinates.x, gridCoordinates.y);
    if (description) {
      setLocationDescription(description);
    }
  };
  
  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-4">
      <h3 className="text-lg font-semibold mb-3">Navigation System</h3>
      
      {/* Grid Overlay Toggle */}
      <div className="mb-4 flex items-center">
        <button 
          onClick={toggleGridOverlay}
          className={`px-3 py-1 rounded text-sm mr-2 ${showGrid ? 'bg-green-600' : 'bg-blue-600'}`}
        >
          {showGrid ? 'Hide Grid' : 'Show Grid'}
        </button>
        
        {/* AI Detection Button - only when grid is visible */}
        {showGrid && onDetectPlayerPosition && (
          <button
            onClick={async () => {
              if (onDetectPlayerPosition) {
                const position = await onDetectPlayerPosition();
                if (position) {
                  setGridCoordinates(position);
                  setNewLocationX(position.x.toString());
                  setNewLocationY(position.y.toString());
                  setNewLocationName(`Player_Position_${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')}`);
                }
              }
            }}
            className="px-3 py-1 rounded text-sm mr-2 bg-purple-600 hover:bg-purple-700"
          >
            Detect Player
          </button>
        )}
        
        {/* Analyze Location button */}
        {showGrid && gridCoordinates && onAnalyzeGridLocation && (
          <button
            onClick={handleAnalyzeLocation}
            className="px-3 py-1 rounded text-sm mr-2 bg-blue-600 hover:bg-blue-700"
          >
            Analyze Location
          </button>
        )}
        
        {gridCoordinates && (
          <span className="text-sm text-gray-300">
            Selected: ({gridCoordinates.x}, {gridCoordinates.y})
          </span>
        )}
      </div>
      
      {/* Location description */}
      {locationDescription && (
        <div className="mb-4 p-2 bg-gray-700 rounded text-sm">
          <strong>At ({gridCoordinates?.x}, {gridCoordinates?.y}):</strong> {locationDescription}
        </div>
      )}
      
      {/* Grid Overlay Display */}
      {showGrid && screenCapture && (
        <div 
          ref={canvasContainerRef} 
          className="relative mb-4 border border-gray-700 w-full"
          style={{ height: '288px' }} // Twice the Game Boy screen height
        >
          {/* Base game screen image */}
          <img 
            src={`data:image/png;base64,${screenCapture}`} 
            alt="Game screen" 
            className="absolute top-0 left-0 w-full h-full object-cover"
          />
          
          {/* Grid overlay canvas */}
          <canvas 
            ref={overlayCanvasRef}
            onClick={handleOverlayClick}
            width={160} // Game Boy resolution
            height={144}
            className="absolute top-0 left-0 w-full h-full cursor-crosshair"
          />
        </div>
      )}
      
      {/* Add New Location Form */}
      <div className="mb-4 p-3 bg-gray-700 rounded">
        <h4 className="text-sm font-medium mb-2">Add New Grid Location</h4>
        <div className="flex flex-wrap gap-2 mb-2">
          <input 
            type="text"
            placeholder="Location name"
            value={newLocationName}
            onChange={(e) => setNewLocationName(e.target.value)}
            className="flex-grow p-1 bg-gray-800 rounded text-sm"
          />
          <input 
            type="number"
            placeholder="X"
            value={newLocationX}
            onChange={(e) => setNewLocationX(e.target.value)}
            min="0"
            max={DEFAULT_GRID.width - 1}
            className="w-12 p-1 bg-gray-800 rounded text-sm"
          />
          <input 
            type="number"
            placeholder="Y"
            value={newLocationY}
            onChange={(e) => setNewLocationY(e.target.value)}
            min="0"
            max={DEFAULT_GRID.height - 1}
            className="w-12 p-1 bg-gray-800 rounded text-sm"
          />
        </div>
        <button 
          className="w-full px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
          onClick={handleAddLocation}
          disabled={!newLocationName.trim()}
        >
          Add Location
        </button>
      </div>
      
      {/* Navigation Controls */}
      <div className="mb-3">
        <label className="block mb-1">From:</label>
        <select 
          value={startPoint} 
          onChange={(e) => setStartPoint(e.target.value)}
          className="w-full p-2 bg-gray-700 rounded"
        >
          <option value="">Select location</option>
          {availableLocations.map(loc => (
            <option key={`start-${loc}`} value={loc}>{loc}</option>
          ))}
        </select>
      </div>
      
      <div className="mb-3">
        <label className="block mb-1">To:</label>
        <select 
          value={endPoint} 
          onChange={(e) => setEndPoint(e.target.value)}
          className="w-full p-2 bg-gray-700 rounded"
        >
          <option value="">Select location</option>
          {availableLocations.map(loc => (
            <option key={`end-${loc}`} value={loc}>{loc}</option>
          ))}
        </select>
      </div>
      
      <button 
        onClick={handleNavigateClick}
        disabled={!startPoint || !endPoint || isNavigating || startPoint === endPoint}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded disabled:bg-gray-600"
      >
        Find Path
      </button>
      
      {/* Navigation Progress */}
      {isNavigating && (
        <div className="mt-3">
          <div className="flex justify-between text-sm mb-1">
            <span>Progress:</span>
            <span>{progress.current} of {progress.total}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{ width: `${progress.total ? (progress.current / progress.total * 100) : 0}%` }}
            ></div>
          </div>
          {progress.currentAction && (
            <div className="text-xs text-center mt-1">
              Current Action: {progress.currentAction.description}
            </div>
          )}
        </div>
      )}
      
      {/* Frequently Used Paths */}
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-2">Frequently Used Paths</h4>
        {frequentPaths.length > 0 ? (
          <div className="grid gap-2">
            {frequentPaths.map(path => (
              <button
                key={path.id}
                onClick={() => handleFrequentPathClick(path)}
                className="text-left p-2 bg-gray-700 hover:bg-gray-650 rounded text-sm flex justify-between items-center"
              >
                <span>{path.startName} → {path.endName}</span>
                <span className="text-xs text-gray-400">Used {path.useCount}×</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-400">
            No navigation paths available yet.
          </div>
        )}
      </div>
      
      {/* Saved Locations */}
      {availableLocations.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Saved Locations</h4>
          <div className="grid gap-1">
            {availableLocations.map(location => (
              <div
                key={location}
                className="p-2 bg-gray-700 rounded text-sm flex justify-between items-center"
              >
                <span>{location}</span>
                <button
                  onClick={() => handleDeleteLocation(location)}
                  className="text-red-400 hover:text-red-300 text-xs"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NavigationPanel;

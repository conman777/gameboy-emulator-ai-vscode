// GridNavigationService.ts - Grid-based navigation system for the Game Boy emulator
import { GameBoyButton } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Grid configuration
export interface GridConfig {
  width: number;      // Game world width in grid cells
  height: number;     // Game world height in grid cells
  cellPixelWidth: number;   // Width of each cell in pixels
  cellPixelHeight: number;  // Height of each cell in pixels
}

// Default grid is 16x16 for Game Boy screen (160x144 pixels)
export const DEFAULT_GRID: GridConfig = {
  width: 16,
  height: 16,
  cellPixelWidth: 10,
  cellPixelHeight: 9  // Slightly rectangular to match Game Boy aspect ratio
};

// Player position on the grid
export interface GridPosition {
  x: number;
  y: number;
}

// Navigation instruction with button and timing
export interface NavigationInstruction {
  button: GameBoyButton;
  duration: number;  // Duration to hold the button in milliseconds
  description: string;
}

// Store grid positions for known locations
let knownLocations: Record<string, GridPosition> = {};

/**
 * Initialize the service - load any saved locations
 */
export function initGridNavigation(): void {
  const saved = localStorage.getItem('knownGridLocations');
  if (saved) {
    try {
      knownLocations = JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load saved grid locations:", e);
      knownLocations = {};
    }
  }
}

/**
 * Registers a named location with grid coordinates
 */
export function registerLocation(name: string, x: number, y: number): void {
  if (name && !isNaN(x) && !isNaN(y)) {
    knownLocations[name] = { x, y };
    
    // Save to localStorage for persistence
    localStorage.setItem('knownGridLocations', JSON.stringify(knownLocations));
  }
}

/**
 * Gets all registered locations
 */
export function getAllLocations(): Record<string, GridPosition> {
  return {...knownLocations};
}

/**
 * Get location names
 */
export function getLocationNames(): string[] {
  return Object.keys(knownLocations);
}

/**
 * Delete a location by name
 */
export function deleteLocation(name: string): boolean {
  if (knownLocations[name]) {
    delete knownLocations[name];
    localStorage.setItem('knownGridLocations', JSON.stringify(knownLocations));
    return true;
  }
  return false;
}

/**
 * Calculate the grid position from pixel coordinates
 */
export function pixelToGrid(
  pixelX: number, 
  pixelY: number, 
  gridConfig: GridConfig = DEFAULT_GRID
): GridPosition {
  return {
    x: Math.floor(pixelX / gridConfig.cellPixelWidth),
    y: Math.floor(pixelY / gridConfig.cellPixelHeight)
  };
}

/**
 * Calculate pixel coordinates from grid position
 */
export function gridToPixel(
  gridX: number,
  gridY: number,
  gridConfig: GridConfig = DEFAULT_GRID
): {x: number, y: number} {
  return {
    x: gridX * gridConfig.cellPixelWidth + gridConfig.cellPixelWidth / 2,
    y: gridY * gridConfig.cellPixelHeight + gridConfig.cellPixelHeight / 2
  };
}

/**
 * Generate navigation instructions to move from one grid position to another
 */
export function calculatePath(
  start: GridPosition,
  end: GridPosition
): NavigationInstruction[] {
  const path: NavigationInstruction[] = [];
  let current = { ...start };
  
  // Simple implementation of pathfinding
  while (current.x !== end.x || current.y !== end.y) {    // Move horizontally first
    if (current.x < end.x) {
      path.push({ 
        button: 'right', 
        duration: 200, 
        description: `Move RIGHT from (${current.x},${current.y}) to (${current.x + 1},${current.y})`
      });
      current.x++;
    } else if (current.x > end.x) {
      path.push({ 
        button: 'left', 
        duration: 200, 
        description: `Move LEFT from (${current.x},${current.y}) to (${current.x - 1},${current.y})`
      });
      current.x--;
    } 
    // Then move vertically
    else if (current.y < end.y) {
      path.push({ 
        button: 'down', 
        duration: 200, 
        description: `Move DOWN from (${current.x},${current.y}) to (${current.x},${current.y + 1})`
      });
      current.y++;
    } else if (current.y > end.y) {
      path.push({ 
        button: 'up', 
        duration: 200, 
        description: `Move UP from (${current.x},${current.y}) to (${current.x},${current.y - 1})`
      });
      current.y--;
    }
  }
  
  return path;
}

/**
 * Generate navigation instructions between named locations
 */
export function findPathBetweenLocations(
  startName: string, 
  endName: string
): NavigationInstruction[] | null {
  const startPos = knownLocations[startName];
  const endPos = knownLocations[endName];
  
  if (!startPos || !endPos) {
    return null; // One or both locations not found
  }
  
  return calculatePath(startPos, endPos);
}

/**
 * Save frequent paths
 */
export interface SavedPath {
  id: string;
  startName: string;
  endName: string;
  useCount: number;
  lastUsed: number;
}

let frequentPaths: SavedPath[] = [];

/**
 * Initialize frequent paths
 */
export function initFrequentPaths(): void {
  const saved = localStorage.getItem('frequentNavigationPaths');
  if (saved) {
    try {
      frequentPaths = JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load saved frequent paths:", e);
      frequentPaths = [];
    }
  }
}

/**
 * Record use of a path
 */
export function recordPathUse(startName: string, endName: string): void {
  // Find existing path
  let path = frequentPaths.find(p => p.startName === startName && p.endName === endName);
  
  if (path) {
    // Update existing path
    path.useCount++;
    path.lastUsed = Date.now();
  } else {
    // Create new path
    path = {
      id: uuidv4(),
      startName,
      endName,
      useCount: 1,
      lastUsed: Date.now()
    };
    frequentPaths.push(path);
  }
  
  // Save to localStorage
  localStorage.setItem('frequentNavigationPaths', JSON.stringify(frequentPaths));
}

/**
 * Get frequent paths, sorted by use count
 */
export function getFrequentPaths(limit: number = 5): SavedPath[] {
  return [...frequentPaths]
    .sort((a, b) => b.useCount - a.useCount)
    .slice(0, limit);
}

/**
 * Create a visual representation of the grid for debugging
 */
export function drawGridOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  gridConfig: GridConfig = DEFAULT_GRID
): void {
  // Clear the canvas
  ctx.clearRect(0, 0, width, height);
  
  // Draw grid lines
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.4)';
  ctx.lineWidth = 1;
  
  // Calculate cell dimensions in canvas space
  const cellWidth = width / gridConfig.width;
  const cellHeight = height / gridConfig.height;
  
  // Vertical lines
  for (let x = 0; x <= gridConfig.width; x++) {
    ctx.beginPath();
    ctx.moveTo(x * cellWidth, 0);
    ctx.lineTo(x * cellWidth, height);
    ctx.stroke();
  }
  
  // Horizontal lines
  for (let y = 0; y <= gridConfig.height; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * cellHeight);
    ctx.lineTo(width, y * cellHeight);
    ctx.stroke();
  }
  
  // Add coordinate labels (skip some to avoid clutter)
  ctx.fillStyle = 'white';
  ctx.font = '10px Arial';
  
  for (let x = 0; x < gridConfig.width; x += 2) {
    for (let y = 0; y < gridConfig.height; y += 2) {
      ctx.fillText(
        `${x},${y}`, 
        x * cellWidth + 2, 
        y * cellHeight + 10
      );
    }
  }
  
  // Mark known locations
  ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
  Object.entries(knownLocations).forEach(([name, pos]) => {
    const pixelX = pos.x * cellWidth;
    const pixelY = pos.y * cellHeight;
    
    // Draw a highlighted cell
    ctx.fillRect(pixelX, pixelY, cellWidth, cellHeight);
    
    // Draw the location name
    ctx.fillStyle = 'black';
    ctx.fillText(name, pixelX + 2, pixelY + cellHeight / 2);
    ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
  });
}

// Initialize the service when imported
initGridNavigation();
initFrequentPaths();

export default {
  registerLocation,
  getAllLocations,
  getLocationNames,
  deleteLocation,
  pixelToGrid,
  gridToPixel,
  calculatePath,
  findPathBetweenLocations,
  recordPathUse,
  getFrequentPaths,
  drawGridOverlay,
  DEFAULT_GRID
};

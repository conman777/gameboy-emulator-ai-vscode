/**
 * GameBoy button types
 */
export type GameBoyButton = 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'start' | 'select';

/**
 * Emulator status
 */
export type EmulatorStatus = 'idle' | 'loading' | 'ready' | 'running' | 'paused' | 'error';

/**
 * AI status
 */
export type AIStatus = 'Inactive' | 'Active' | 'Error';

/**
 * ROM file information
 */
export interface ROMInfo {
  fileName: string;
  fileSize: number;
  title?: string;
  gameCode?: string;
}

/**
 * Emulator state for context
 */
export interface EmulatorState {
  status: EmulatorStatus;
  romInfo: ROMInfo | null;
  errorMessage: string | null;
  isRunning: boolean;
  isPaused: boolean;
}

/**
 * OpenRouter API model information
 */
export interface OpenRouterModel {
  id: string;
  name: string;
  context_length: number;
  pricing: {
    prompt: number;
    completion: number;
  };
  capabilities: string[];
  hasVision?: boolean; // Whether the model supports vision/image inputs
}

/**
 * Model option for UI select components
 */
export interface ModelOption {
  id: string;
  name: string;
  hasVision?: boolean;
}

/**
 * AI Configuration
 */
export interface AIConfig {
  apiKey: string;
  modelName: string;
  captureInterval: number;
  isActive: boolean;
  gameContext?: string;
}

/**
 * Represents a piece of knowledge about a game.
 */
export interface KnowledgeEntry {
  id: string; // Unique identifier (e.g., UUID)
  gameTitle: string; // To scope knowledge to specific ROMs, matches romInfo.title
  type: 'objective' | 'rule' | 'tip' | 'enemy_info' | 'item_info' | 'location_fact' | 'strategy' | 'control_info' | 'general_note';
  description: string; // The actual piece of knowledge
  keywords?: string[]; // Optional, for better retrieval
  importance?: 'low' | 'medium' | 'high'; // Optional, to prioritize
  relatedCoordinates?: { x: number; y: number }; // Optional, if tied to a grid location
  createdAt: string; // ISO date string
}

/**
 * Represents a navigation point or connection in the game world.
 */
export interface NavigationPoint {
  id: string; // Unique identifier (e.g., nav_UUID)
  name: string; // User-friendly name for this navigation point or path
  description: string; // More details about this point/path
  gameTitle: string; // To scope navigation to specific ROMs, matches romInfo.title
  fromLocation: string; // Name of the starting location/area
  toLocation: string;   // Name of the destination location/area
  // screenshot?: string; // Optional: Base64 image for visual reference of the path/point
  directions?: GameBoyButton[]; // Optional: Sequence of button presses for automated traversal
  tags?: string[]; // Optional: For categorization and search (e.g., 'town_to_dungeon', 'requires_item_X')
  // Add any other relevant fields like estimated_time, difficulty, one_way, etc.
  createdAt: string; // ISO date string, replacing old timestamp
}

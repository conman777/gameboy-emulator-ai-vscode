export type GameBoyButton = 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'start' | 'select';

export interface EmulatorWrapperApi {
  loadROM(romData: ArrayBuffer): Promise<{ success: boolean; message?: string; title?: string }>;
  start(): void;
  stop(): void;
  isReady(): boolean;
  isRunning(): boolean;
  getScreenDataAsBase64(): Promise<string | null>;
  pressButton(button: GameBoyButton): void;
  releaseButton(button: GameBoyButton): void;
  getCanvas(): HTMLCanvasElement | null;
}

// Interface for OpenRouter model returned from the API
export interface OpenRouterModel {
  id: string;
  name: string;
  context_length: number;
  pricing: { prompt: number; completion: number };
  capabilities: string[];
}

// Interface for models used in the UI
export interface ModelOption {
  id: string;
  name: string;
  hasVision: boolean;
}

// New types for the LLM Goal/Objective Understanding System
export interface AIGoal {
  id: string;
  type: 'high-level' | 'user-defined';
  description: string;
  status: 'active' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  // Optional context that could help achieve this goal
  additionalContext?: string;
}

export interface AISystemPrompt {
  id: string;
  name: string;
  description: string;
  content: string;
  isDefault?: boolean;
  createdAt: string;
}

// Types for the AI output format
export interface AIActionResponse {
  action: GameBoyButton | 'none' | 'error'; // Added 'error' to the union type
  reasoning: string;
  goalProgress?: string;
  // For more complex actions in the future
  duration?: number; // milliseconds
  sequence?: AIButtonSequence[];
}

export interface AIButtonSequence {
  button: GameBoyButton;
  action: 'press' | 'hold' | 'release';
  duration?: number; // milliseconds - for hold actions
}

// Existing types that might be referenced

// --- Feedback System Types ---

// Represents a detected game event
export interface GameEvent {
  type: string; // e.g., 'SCORE_INCREASED', 'NEW_LEVEL', 'PLAYER_DIED', 'GAME_OVER_DETECTED'
  timestamp: number;
  data?: any; // Additional data, e.g., score change amount, new level ID, matched text
  source: 'ram' | 'screen_text' | 'image_pattern' | 'manual' | 'system'; // Origin of the event
}

// Base configuration for an event detector
export interface EventDetectorBaseConfig {
  id: string; // Unique ID for this detector instance, used for cooldowns and event types
  type: 'ram' | 'screen_text' | 'image_pattern';
  description?: string;
  // gameTitlePattern?: string; // To scope detectors to specific games, managed by GameFeedbackConfig
  cooldown?: number; // Minimum time in ms between triggering this specific detector instance
  enabled?: boolean; // Default true
}

// Configuration for RAM-based event detectors
export interface RamDetectorConfig extends EventDetectorBaseConfig {
  type: 'ram';
  address: string; // Memory address (hex, e.g., "0xC0A0")
  dataType: 'uint8' | 'uint16' | 'int8' | 'int16' | 'string'; // Data type at the address
  comparison: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'changed' | 'increased' | 'decreased';
  value?: any; // Value to compare against (if not 'changed', 'increased', 'decreased')
  previousValue?: any; // Stores the last known value for 'changed', 'increased', 'decreased' detection
  changeThreshold?: number; // For 'increased'/'decreased', minimum change to trigger
}

// Configuration for screen text-based event detectors (requires OCR)
export interface ScreenTextDetectorConfig extends EventDetectorBaseConfig {
  type: 'screen_text';
  searchText: string; // Text to look for
  isRegex?: boolean; // Whether searchText is a regex
  caseSensitive?: boolean; // Default false
  region?: { x: number; y: number; width: number; height: number }; // Optional screen region (percentages or pixels)
}

// Configuration for image pattern-based event detectors
export interface ImagePatternDetectorConfig extends EventDetectorBaseConfig {
  type: 'image_pattern';
  patternImageUrl?: string; // URL or path to a small image pattern to detect (loaded by the system)
  base64Pattern?: string; // Or the pattern as base64
  similarityThreshold?: number; // 0.0 (no match) to 1.0 (perfect match), e.g., 0.8
  region?: { x: number; y: number; width: number; height: number }; // Optional screen region
}

// Union type for all event detector configurations
export type EventDetectorConfig = RamDetectorConfig | ScreenTextDetectorConfig | ImagePatternDetectorConfig;

// Defines how a reward/penalty is applied for a specific event type
export interface RewardRule {
  id: string; // Unique ID for the rule
  eventType: string; // Matches GameEvent.type (which often comes from EventDetectorConfig.id)
  reward: number; // Positive for reward, negative for penalty. Can be 'DELTA_SCORE_DIV_100'.
  condition?: string; // Optional condition on event.data (e.g., 'event.data.change > 10') - advanced
  description?: string;
  enabled?: boolean; // Default true
}

// Contextual information for the feedback system, passed to pollEvents
export interface FeedbackContext {
  gameTitle: string; // Title of the current game
  currentEmulatorTime?: number; // Emulator's internal timestamp, if available
  // Other game state information that might be readily available without new detectors
  lastAction?: GameBoyButton | 'none';
}

// Output of the feedback engine's poll_events method
export interface FeedbackResult {
  textFeedback: string[]; // Array of feedback messages for the LLM prompt
  numericalReward: number; // Single float value for this frame/step
  rawEvents: GameEvent[]; // List of events detected in this poll
  episodeTotalReward: number; // Running total for the current episode
}

// Structure for game-specific feedback configuration, typically loaded from a JSON file
export interface GameFeedbackConfig {
  gameTitlePattern: string; // Regex to match game titles this config applies to (e.g., "Pokemon Red|Blue")
  detectors: EventDetectorConfig[];
  rewardRules: RewardRule[];
  defaultRewardForUnknownEvent?: number; // Optional: small penalty for unexpected events
}

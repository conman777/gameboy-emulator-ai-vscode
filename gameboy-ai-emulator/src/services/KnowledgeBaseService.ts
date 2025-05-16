// KnowledgeBaseService.ts - Service for managing AI's knowledge base
import { GameBoyButton, KnowledgeEntry, NavigationPoint } from '../types'; // Import KnowledgeEntry & NavigationPoint from global types

export interface KnowledgeBase {
  entries: KnowledgeEntry[]; 
  navigationPoints: NavigationPoint[]; // Use imported NavigationPoint
}

// Default empty knowledge base
const initialKnowledgeBase: KnowledgeBase = {
  entries: [],
  navigationPoints: []
};

// The current knowledge base (in-memory)
let knowledgeBase: KnowledgeBase = { ...initialKnowledgeBase };

// Load knowledge base from localStorage on init
try {
  const storedKB = localStorage.getItem('ai_knowledge_base');
  if (storedKB) {
    const parsed = JSON.parse(storedKB);
    // Convert string dates back to Date objects for entries if they exist and have a timestamp
    // For new KnowledgeEntry, createdAt is a string, so direct parsing is fine.
    // We might need to handle migration if old entries with `timestamp: Date` exist.
    if (parsed.entries) {
      parsed.entries = parsed.entries.map((entry: any) => {
        // Basic check for old format vs new format
        if (entry.timestamp && !(typeof entry.timestamp === 'string')) { // Old format likely
          return {
            ...entry, // Spread old fields
            id: entry.id || `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            gameTitle: entry.gameTitle || 'Unknown Game', // Add default if missing
            type: entry.category || 'general_note', // Map old category to new type
            description: entry.note || 'No description', // Map old note to new description
            createdAt: new Date(entry.timestamp).toISOString(), // Convert timestamp
            // keywords, importance, relatedCoordinates would be undefined unless added
          };
        }
        // If it has createdAt, assume it's new format or already migrated
        if (entry.createdAt) {
          return entry;
        }
        // If it's an old entry without 'timestamp' but has 'note', try to migrate
        if (entry.note && !entry.timestamp && !entry.createdAt) {
           return {
            id: entry.id || `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            gameTitle: entry.gameTitle || 'Unknown Game',
            type: entry.category || 'general_note',
            description: entry.note,
            createdAt: new Date().toISOString(), // Default to now
            keywords: entry.tags || [],
          };
        }
        // Fallback for unrecognized structure, might need adjustment
        return {
          ...entry,
          id: entry.id || `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: entry.createdAt || new Date().toISOString(),
          gameTitle: entry.gameTitle || 'Unknown Game',
          type: entry.type || 'general_note',
          description: entry.description || entry.note || 'No description'
        };
      });
    }

    if (parsed.navigationPoints) {
      parsed.navigationPoints = parsed.navigationPoints.map((point: any) => {
        // Check if it needs migration from old format (timestamp: Date)
        if (point.timestamp && !(typeof point.timestamp === 'string')) {
          return {
            ...point, // Spread old fields
            id: point.id || `nav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            gameTitle: point.gameTitle || 'Unknown Game', // Add default gameTitle
            createdAt: new Date(point.timestamp).toISOString(), // Convert timestamp to createdAt
            // Remove old timestamp if it exists after conversion to avoid confusion
            timestamp: undefined 
          };
        }
        // If it has createdAt, assume it's new format or already migrated
        // Ensure essential fields for new format are present
        return {
          ...point,
          id: point.id || `nav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          gameTitle: point.gameTitle || 'Unknown Game',
          createdAt: point.createdAt || new Date().toISOString(),
          name: point.name || 'Unnamed Point',
          description: point.description || 'No description',
          fromLocation: point.fromLocation || 'Unknown',
          toLocation: point.toLocation || 'Unknown',
        };
      });
    }
    knowledgeBase = parsed;
  }
} catch (error) {
  console.error('Error loading knowledge base:', error);
}

/**
 * Save the knowledge base to localStorage
 */
const saveKnowledgeBase = (): void => {
  try {
    localStorage.setItem('ai_knowledge_base', JSON.stringify(knowledgeBase));
  } catch (error) {
    console.error('Error saving knowledge base:', error);
  }
};

/**
 * Add a new knowledge entry based on the new KnowledgeEntry type
 */
export const addKnowledgeEntry = (
  entryData: Omit<KnowledgeEntry, 'id' | 'createdAt'> & { id?: string; createdAt?: string }
): KnowledgeEntry => {
  const newEntry: KnowledgeEntry = {
    id: entryData.id || `ke_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    gameTitle: entryData.gameTitle,
    type: entryData.type,
    description: entryData.description,
    keywords: entryData.keywords || [],
    importance: entryData.importance || 'medium',
    relatedCoordinates: entryData.relatedCoordinates,
    createdAt: entryData.createdAt || new Date().toISOString(),
  };
  
  knowledgeBase.entries.push(newEntry);
  saveKnowledgeBase();
  console.log('Added new knowledge entry:', newEntry);
  return newEntry;
};


/**
 * Add a new navigation point using the global NavigationPoint type
 */
export const addNavigationPoint = (
  pointData: Omit<NavigationPoint, 'id' | 'createdAt'> & { id?: string; createdAt?: string }
): NavigationPoint => {
  const newPoint: NavigationPoint = {
    id: pointData.id || `nav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: pointData.name,
    description: pointData.description,
    gameTitle: pointData.gameTitle, // Ensure gameTitle is included
    fromLocation: pointData.fromLocation,
    toLocation: pointData.toLocation,
    directions: pointData.directions || [],
    // screenshot: pointData.screenshot, // Optional
    tags: pointData.tags || [],       // Optional
    createdAt: pointData.createdAt || new Date().toISOString(),
  };
  
  knowledgeBase.navigationPoints.push(newPoint);
  saveKnowledgeBase();
  console.log('Added new navigation point:', newPoint);
  return newPoint;
};

/**
 * Delete a knowledge entry
 */
export const deleteKnowledgeEntry = (id: string): boolean => {
  const initialLength = knowledgeBase.entries.length;
  knowledgeBase.entries = knowledgeBase.entries.filter(entry => entry.id !== id);
  
  if (knowledgeBase.entries.length !== initialLength) {
    saveKnowledgeBase();
    return true;
  }
  return false;
};

/**
 * Delete a navigation point
 */
export const deleteNavigationPoint = (id: string): boolean => {
  const initialLength = knowledgeBase.navigationPoints.length;
  knowledgeBase.navigationPoints = knowledgeBase.navigationPoints.filter(point => point.id !== id);
  
  if (knowledgeBase.navigationPoints.length !== initialLength) {
    saveKnowledgeBase();
    return true;
  }
  return false;
};

/**
 * Returns all knowledge entries.
 * Now reads from the unified knowledgeBase object.
 */
export const getAllKnowledgeEntries = (): KnowledgeEntry[] => {
  return knowledgeBase.entries.map(entry => {
    // Ensure all entries conform to the latest structure, applying defaults if necessary
    // This is more of a safeguard / light migration for entries potentially added by other means
    // or if the structure was manually edited in localStorage.
    return {
      id: entry.id || `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      gameTitle: entry.gameTitle || 'Unknown Game',
      type: entry.type || 'general_note',
      description: entry.description || (entry as any).note || 'No description',
      keywords: entry.keywords || (entry as any).tags || [],
      importance: entry.importance || 'medium',
      relatedCoordinates: entry.relatedCoordinates,
      createdAt: entry.createdAt || (entry as any).timestamp?.toISOString() || new Date().toISOString(),
    };
  });
};

/**
 * Returns all navigation points, ensuring they conform to the global NavigationPoint type.
 */
export const getAllNavigationPoints = (): NavigationPoint[] => {
  // The loading logic already tries to conform them, this is a final check/map.
  return knowledgeBase.navigationPoints.map(point => ({
    id: point.id || `nav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: point.name || 'Unnamed Point',
    description: point.description || 'No description',
    gameTitle: point.gameTitle || 'Unknown Game',
    fromLocation: point.fromLocation || 'Unknown',
    toLocation: point.toLocation || 'Unknown',
    directions: point.directions || [],
    // screenshot: point.screenshot,
    tags: point.tags || [],
    createdAt: point.createdAt || (point as any).timestamp?.toISOString?.() || new Date().toISOString(),
  }));
};

/**
 * Search knowledge entries based on the new structure
 */
export const searchKnowledgeBase = (query: string, gameTitle?: string, types?: string[]): KnowledgeEntry[] => { // Changed tags to types for clarity
  const lowerQuery = query.toLowerCase();
  
  return knowledgeBase.entries.filter(entry => {
    let matches = true;

    if (query) {
      const descMatch = entry.description.toLowerCase().includes(lowerQuery);
      const keywordMatch = (entry.keywords || []).some(k => k.toLowerCase().includes(lowerQuery));
      matches = matches && (descMatch || keywordMatch);
    }
    
    if (gameTitle) {
      matches = matches && entry.gameTitle.toLowerCase() === gameTitle.toLowerCase();
    }

    if (types && types.length > 0 && types[0] !== 'all') { // Ensure 'all' doesn't filter
      matches = matches && types.includes(entry.type);
    }
    
    return matches;
  });
};

/**
 * Search navigation points, can be filtered by gameTitle.
 */
export const searchNavigationPoints = (query: string, gameTitle?: string, tags?: string[]): NavigationPoint[] => {
  const lowerQuery = query.toLowerCase();
  
  return knowledgeBase.navigationPoints.filter(point => {
    let matchesQuery = true;
    if (query) {
      matchesQuery = 
        point.name.toLowerCase().includes(lowerQuery) || 
        point.description.toLowerCase().includes(lowerQuery) ||
        point.fromLocation.toLowerCase().includes(lowerQuery) ||
        point.toLocation.toLowerCase().includes(lowerQuery);
    }

    let matchesGame = true;
    if (gameTitle) {
      matchesGame = point.gameTitle.toLowerCase() === gameTitle.toLowerCase();
    }
    
    let matchesTags = true;
    if (tags && tags.length > 0) {
      matchesTags = tags.every(tag => (point.tags || []).map(t => t.toLowerCase()).includes(tag.toLowerCase()));
    }
        
    return matchesQuery && matchesGame && matchesTags;
  });
};

/**
 * Clear all knowledge
 */
export const clearKnowledgeBase = (): void => {
  knowledgeBase = { ...initialKnowledgeBase };
  saveKnowledgeBase();
};

/**
 * Find a navigation path from one location to another
 */
export const findNavigationPath = (from: string, to: string): NavigationPoint[] => {
  // Very simple implementation - just find direct paths
  const directPaths = knowledgeBase.navigationPoints.filter(
    point => point.fromLocation.toLowerCase() === from.toLowerCase() && 
             point.toLocation.toLowerCase() === to.toLowerCase()
  );
  
  if (directPaths.length > 0) {
    return directPaths;
  }
  
  // TODO: Implement a more sophisticated path-finding algorithm
  // For now, just return empty array if no direct path
  return [];
};

/**
 * Add an entry to the knowledge base with an AI observation.
 * Updated to use the new KnowledgeEntry structure.
 */
export const recordAIObservation = (
  aiThought: string, 
  gameTitle: string, // Added gameTitle
  action?: GameBoyButton | 'none' | null, // Made action optional
  screenshot?: string,
  relatedCoordinates?: { x: number; y: number }
): KnowledgeEntry => {
  const keywords: string[] = [];
  
  if (action && action !== 'none') {
    keywords.push(`action:${action}`);
  }
  if (aiThought) {
    // Basic keyword extraction (example)
    const thoughtWords = aiThought.toLowerCase().match(/\b(\w+)\b/g);
    if (thoughtWords) {
      thoughtWords.forEach(word => {
        if (word.length > 3 && !keywords.some(kw => kw.includes(word))) { // Avoid single letters or duplicates
           // Add more sophisticated keyword extraction if needed
        }
      });
    }
  }

  let type: KnowledgeEntry['type'] = 'general_note';
  const lowerThought = aiThought.toLowerCase();

  if (lowerThought.includes('objective') || lowerThought.includes('goal')) type = 'objective';
  else if (lowerThought.includes('rule') || lowerThought.includes('must') || lowerThought.includes('should not')) type = 'rule';
  else if (lowerThought.includes('tip') || lowerThought.includes('try to') || lowerThought.includes('good idea')) type = 'tip';
  else if (lowerThought.includes('enemy') || lowerThought.includes('monster') || lowerThought.includes('danger')) type = 'enemy_info';
  else if (lowerThought.includes('item') || lowerThought.includes('pickup') || lowerThought.includes('power-up')) type = 'item_info';
  else if (lowerThought.includes('location') || lowerThought.includes('area') || lowerThought.includes('place')) type = 'location_fact';
  else if (lowerThought.includes('strategy') || lowerThought.includes('plan') || lowerThought.includes('approach')) type = 'strategy';
  else if (lowerThought.includes('control') || lowerThought.includes('button') || lowerThought.includes('how to')) type = 'control_info';
  
  const entryData: Omit<KnowledgeEntry, 'id' | 'createdAt'> = {
    gameTitle,
    type,
    description: aiThought,
    keywords,
    importance: 'medium', // Default importance
    relatedCoordinates,
    // screenshot can be added if we modify KnowledgeEntry to include it, or link it differently
  };
  
  // If screenshot is provided and your KnowledgeEntry type is updated to store it:
  // if (screenshot) (entryData as any).screenshot = screenshot; // Example if adding screenshot to KnowledgeEntry

  return addKnowledgeEntry(entryData);
};

export default {
  addKnowledgeEntry,
  addNavigationPoint,
  deleteKnowledgeEntry,
  deleteNavigationPoint,
  getAllKnowledgeEntries,
  getAllNavigationPoints,
  searchKnowledgeBase,
  searchNavigationPoints,
  clearKnowledgeBase,
  findNavigationPath,
  recordAIObservation
};

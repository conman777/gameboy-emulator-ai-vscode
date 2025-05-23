// src/services/StorageService.ts

const DB_NAME = 'GameBoyEmulatorDB';
const STORE_NAME = 'roms';
const ROM_KEY = 'lastLoadedRom';
const DB_VERSION = 1;

export interface StoredRom { // Export StoredRom interface
  name: string;
  data: ArrayBuffer;
}

let dbPromise: Promise<IDBDatabase> | null = null;

const initDB = (): Promise<IDBDatabase> => {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      console.error('IndexedDB error:', (event.target as IDBOpenDBRequest).error);
      reject('Error opening IndexedDB.');
      dbPromise = null; // Reset promise on error
    };
  });
  return dbPromise;
};

export const saveRom = async (romData: ArrayBuffer, romName: string): Promise<void> => {
  try {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const storedObject: StoredRom = { name: romName, data: romData };
    store.put(storedObject, ROM_KEY);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log('ROM saved to IndexedDB:', romName);
        resolve();
      };
      transaction.onerror = (event) => {
        console.error('Error saving ROM to IndexedDB:', (event.target as IDBTransaction).error);
        reject('Error saving ROM.');
      };
    });
  } catch (error) {
    console.error('Failed to initiate DB for saving ROM:', error);
    throw error; // Re-throw to be caught by caller
  }
};

export const getRom = async (): Promise<StoredRom | null> => {
  try {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(ROM_KEY);

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const result = (event.target as IDBRequest<StoredRom | undefined>).result;
        if (result) {
          console.log('ROM retrieved from IndexedDB:', result.name);
          resolve(result);
        } else {
          resolve(null);
        }
      };
      request.onerror = (event) => {
        console.error('Error getting ROM from IndexedDB:', (event.target as IDBRequest).error);
        reject('Error getting ROM.');
      };
    });
  } catch (error) {
    console.error('Failed to initiate DB for getting ROM:', error);
    return null; // Return null if DB init fails
  }
};

export const clearRom = async (): Promise<void> => {
  try {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete(ROM_KEY);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log('ROM cleared from IndexedDB');
        resolve();
      };
      transaction.onerror = (event) => {
        console.error('Error clearing ROM from IndexedDB:', (event.target as IDBTransaction).error);
        reject('Error clearing ROM.');
      };
    });
  } catch (error) {
    console.error('Failed to initiate DB for clearing ROM:', error);
    throw error; // Re-throw to be caught by caller
  }
};

// Add these required functions for compatibility with Controls.tsx

export const loadLastRom = async (emulator: any): Promise<boolean> => {
  try {
    // Get ROM from storage
    const storedRom = await getRom();
    
    if (!storedRom || !storedRom.data) {
      return false;
    }
    
    // If emulator provided, load the ROM
    if (emulator) {
      const result = await emulator.loadROM(storedRom.data);
      return result.success;
    }
    
    // If no emulator, just indicate we have a ROM
    return true;
  } catch (error) {
    console.error('Error loading last ROM:', error);
    return false;
  }
};

export const clearStoredRom = async (): Promise<void> => {
  return clearRom();
};

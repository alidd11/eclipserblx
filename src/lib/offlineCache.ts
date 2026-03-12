/**
 * Offline-first data caching using IndexedDB via a simple key-value store.
 * Falls back to localStorage if IndexedDB is unavailable.
 */

const DB_NAME = 'eclipse-offline-cache';
const STORE_NAME = 'query-cache';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        if (!result) return resolve(null);
        // Check expiry
        if (result.expiresAt && Date.now() > result.expiresAt) {
          resolve(null);
          return;
        }
        resolve(result.data as T);
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    // Fallback to localStorage
    try {
      const raw = localStorage.getItem(`offline:${key}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) return null;
      return parsed.data as T;
    } catch {
      return null;
    }
  }
}

export async function setCachedData<T>(key: string, data: T, ttlMs: number = 1000 * 60 * 60): Promise<void> {
  const entry = { data, expiresAt: Date.now() + ttlMs, updatedAt: Date.now() };

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(entry, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Fallback to localStorage
    try {
      localStorage.setItem(`offline:${key}`, JSON.stringify(entry));
    } catch {
      // Storage full, ignore
    }
  }
}

export async function clearOfflineCache(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Clear localStorage fallback entries
    Object.keys(localStorage)
      .filter(k => k.startsWith('offline:'))
      .forEach(k => localStorage.removeItem(k));
  }
}

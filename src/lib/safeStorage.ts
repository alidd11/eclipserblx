function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Safari/private-mode safe wrapper around localStorage.
 * - Never throws
 * - Fails open (returns null / false)
 */
export const safeStorage = {
  getItem(key: string): string | null {
    try {
      return getLocalStorage()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },

  setItem(key: string, value: string): boolean {
    try {
      getLocalStorage()?.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },

  removeItem(key: string): void {
    try {
      getLocalStorage()?.removeItem(key);
    } catch {
      // ignore
    }
  },

  key(index: number): string | null {
    try {
      return getLocalStorage()?.key(index) ?? null;
    } catch {
      return null;
    }
  },

  getLength(): number {
    try {
      return getLocalStorage()?.length ?? 0;
    } catch {
      return 0;
    }
  },
};

/**
 * Safari/private-mode safe wrapper around sessionStorage.
 * - Never throws
 * - Fails open (returns null / false)
 * - SessionStorage survives page reloads in the same tab
 */
export const safeSessionStorage = {
  getItem(key: string): string | null {
    try {
      return getSessionStorage()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },

  setItem(key: string, value: string): boolean {
    try {
      getSessionStorage()?.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },

  removeItem(key: string): void {
    try {
      getSessionStorage()?.removeItem(key);
    } catch {
      // ignore
    }
  },
};

// IndexedDB helpers for version persistence (works in Safari private mode)
const DB_NAME = 'eclipse-app-state';
const STORE_NAME = 'key-value';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  });
}

/**
 * Get a value from IndexedDB - works in Safari private mode
 */
export async function getFromIndexedDB(key: string): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onerror = () => {
        db.close();
        resolve(null);
      };

      request.onsuccess = () => {
        db.close();
        resolve(request.result?.value ?? null);
      };
    });
  } catch {
    return null;
  }
}

/**
 * Set a value in IndexedDB - works in Safari private mode
 */
export async function setInIndexedDB(key: string, value: string): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ key, value });

      request.onerror = () => {
        db.close();
        resolve(false);
      };

      request.onsuccess = () => {
        db.close();
        resolve(true);
      };
    });
  } catch {
    return false;
  }
}

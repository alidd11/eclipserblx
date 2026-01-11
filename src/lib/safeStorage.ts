function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
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

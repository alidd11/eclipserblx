

# Fix Version Persistence to Prevent Reload Loops

## Problem Analysis

The current implementation has several vulnerabilities that cause infinite reload loops:

1. **URL Parameter Race Condition**: The `__v` URL parameter is added *before* the reload, but the `bootstrapVersionFromUrl` function runs *after* React mounts. If the app crashes or takes too long to initialize, the parameter never gets consumed.

2. **Storage Verification Missing**: The code sets the version in storage but never verifies it was actually saved. In Safari private mode, `setItem` silently fails.

3. **Runtime Memory Clears on Reload**: `window.__appInstalledVersion` is set, but a page reload clears all JavaScript memory - this only helps if the URL parameter is also set.

4. **No Reload Guard**: There's no mechanism to detect "we just reloaded for an update" and skip the update check for a grace period.

5. **Immediate Check After Bootstrap**: The version check runs immediately after `bootstrapVersionFromUrl`, but the runtime version may not be set yet due to async timing.

## Solution: Multi-Layer Persistence with Reload Guard

Implement a robust, multi-layer approach that prevents reload loops even when all storage mechanisms fail.

### Strategy

```text
┌─────────────────────────────────────────────────────────────────┐
│                    VERSION PERSISTENCE LAYERS                    │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: localStorage (via safeStorage)                        │
│  Layer 2: sessionStorage (survives reloads in same tab)         │
│  Layer 3: URL parameter (fallback for private mode)             │
│  Layer 4: Runtime memory with reload timestamp guard            │
│  Layer 5: IndexedDB (most resilient, works in private mode)     │
└─────────────────────────────────────────────────────────────────┘
```

## Technical Changes

### File 1: `src/lib/safeStorage.ts`

**Add sessionStorage support and IndexedDB fallback:**

```typescript
// Add safeSessionStorage wrapper
export const safeSessionStorage = {
  getItem(key: string): string | null {
    try {
      return window.sessionStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): boolean {
    try {
      window.sessionStorage?.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  removeItem(key: string): void {
    try {
      window.sessionStorage?.removeItem(key);
    } catch {}
  }
};

// Add simple IndexedDB helpers for version persistence
const DB_NAME = 'eclipse-app';
const STORE_NAME = 'app-state';

export async function getFromIndexedDB(key: string): Promise<string | null> {
  // Implementation with try/catch for private mode
}

export async function setInIndexedDB(key: string, value: string): Promise<boolean> {
  // Implementation with try/catch for private mode
}
```

### File 2: `src/hooks/useAppVersionCheck.ts`

**Complete rewrite with robust persistence:**

**Key Changes:**

1. **Add Reload Timestamp Guard**
   - Store a timestamp when triggering a reload
   - On next load, if timestamp is within 30 seconds, skip force update check
   - Prevents immediate re-trigger even if version persistence failed

2. **Multi-Layer Version Reading**
   ```typescript
   const getLocalVersion = async () => {
     // Try each layer in order
     const fromLocal = safeStorage.getItem(LOCAL_VERSION_KEY);
     if (fromLocal) return fromLocal;
     
     const fromSession = safeSessionStorage.getItem(LOCAL_VERSION_KEY);
     if (fromSession) return fromSession;
     
     const fromRuntime = window.__appInstalledVersion;
     if (fromRuntime) return fromRuntime;
     
     const fromIDB = await getFromIndexedDB(LOCAL_VERSION_KEY);
     if (fromIDB) return fromIDB;
     
     return '1.0.0';
   };
   ```

3. **Multi-Layer Version Writing**
   ```typescript
   const setLocalVersion = async (version: string) => {
     // Write to all layers for redundancy
     window.__appInstalledVersion = version;
     safeStorage.setItem(LOCAL_VERSION_KEY, version);
     safeSessionStorage.setItem(LOCAL_VERSION_KEY, version);
     await setInIndexedDB(LOCAL_VERSION_KEY, version).catch(() => {});
   };
   ```

4. **Pre-Reload Version Sync**
   ```typescript
   const forceAppUpdate = async (nextVersion: string) => {
     // Set version in ALL persistence layers BEFORE reload
     await setLocalVersion(nextVersion);
     
     // Also set a "just updated" timestamp
     const updateTime = Date.now().toString();
     safeStorage.setItem('app_last_force_update', updateTime);
     safeSessionStorage.setItem('app_last_force_update', updateTime);
     
     // URL fallback
     const url = new URL(window.location.href);
     url.searchParams.set('__v', nextVersion);
     url.searchParams.set('__t', updateTime);
     window.history.replaceState({}, '', url.toString());
     
     // Then reload
     setTimeout(() => window.location.reload(), 500);
   };
   ```

5. **Reload Guard Check**
   ```typescript
   const wasRecentlyUpdated = () => {
     const GRACE_PERIOD = 30000; // 30 seconds
     
     // Check URL first
     const urlTime = new URL(window.location.href).searchParams.get('__t');
     if (urlTime && Date.now() - parseInt(urlTime) < GRACE_PERIOD) {
       return true;
     }
     
     // Check storage
     const storedTime = safeSessionStorage.getItem('app_last_force_update') 
       || safeStorage.getItem('app_last_force_update');
     if (storedTime && Date.now() - parseInt(storedTime) < GRACE_PERIOD) {
       return true;
     }
     
     return false;
   };
   ```

6. **Update Check with Guard**
   ```typescript
   const checkForUpdate = async () => {
     // Skip if we just updated
     if (wasRecentlyUpdated()) {
       console.log('[AppVersion] Skipping check - recently updated');
       return;
     }
     
     // ... rest of update logic
   };
   ```

7. **Bootstrap Enhancement**
   ```typescript
   const bootstrapVersionFromUrl = useCallback(() => {
     const url = new URL(window.location.href);
     const pending = url.searchParams.get('__v');
     const updateTime = url.searchParams.get('__t');
     
     if (pending) {
       // Set in all layers
       window.__appInstalledVersion = pending;
       safeStorage.setItem(LOCAL_VERSION_KEY, pending);
       safeSessionStorage.setItem(LOCAL_VERSION_KEY, pending);
       setInIndexedDB(LOCAL_VERSION_KEY, pending);
     }
     
     if (updateTime) {
       safeSessionStorage.setItem('app_last_force_update', updateTime);
     }
     
     // Clean URL
     url.searchParams.delete('__v');
     url.searchParams.delete('__t');
     window.history.replaceState({}, '', url.toString());
   }, []);
   ```

## Flow Diagram

```text
App Load
    │
    ▼
┌─────────────────────────────────┐
│  1. bootstrapVersionFromUrl()   │──▶ Consume URL params, set all layers
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│  2. wasRecentlyUpdated()?       │──▶ Check if updated in last 30s
└─────────────────────────────────┘
    │
    ├── YES ──▶ Skip update check (prevents loop)
    │
    ├── NO
    ▼
┌─────────────────────────────────┐
│  3. getLocalVersion()           │──▶ Read from localStorage → sessionStorage
│     (multi-layer read)          │    → runtime memory → IndexedDB
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│  4. Compare with server version │
└─────────────────────────────────┘
    │
    ├── MATCH ──▶ Done
    │
    ├── MISMATCH + force_update
    ▼
┌─────────────────────────────────┐
│  5. setLocalVersion(newVer)     │──▶ Write to ALL layers
│     Set update timestamp        │
│     Add URL params              │
│     Reload                      │
└─────────────────────────────────┘
```

## Benefits

1. **No More Infinite Loops**: 30-second grace period prevents immediate re-trigger
2. **Works in Private Mode**: sessionStorage + URL params + IndexedDB fallbacks
3. **Survives Cache Clears**: Multiple persistence layers provide redundancy
4. **Self-Healing**: Even if some layers fail, others will catch it
5. **Debug-Friendly**: Clear console logs show which layer succeeded

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/safeStorage.ts` | Add `safeSessionStorage`, IndexedDB helpers |
| `src/hooks/useAppVersionCheck.ts` | Multi-layer persistence, reload guard |


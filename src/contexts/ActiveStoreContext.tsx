import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { safeStorage } from '@/lib/safeStorage';

const STORAGE_KEY = 'active-store-id';

interface ActiveStoreContextValue {
  activeStoreId: string | null;
  setActiveStoreId: (id: string | null) => void;
}

const ActiveStoreContext = createContext<ActiveStoreContextValue>({
  activeStoreId: null,
  setActiveStoreId: () => {},
});

export function ActiveStoreProvider({ children }: { children: ReactNode }) {
  const [activeStoreId, setActiveStoreIdState] = useState<string | null>(
    () => safeStorage.getItem(STORAGE_KEY)
  );

  const setActiveStoreId = useCallback((id: string | null) => {
    setActiveStoreIdState(id);
    if (id) {
      safeStorage.setItem(STORAGE_KEY, id);
    } else {
      safeStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return (
    <ActiveStoreContext.Provider value={{ activeStoreId, setActiveStoreId }}>
      {children}
    </ActiveStoreContext.Provider>
  );
}

export function useActiveStore() {
  return useContext(ActiveStoreContext);
}

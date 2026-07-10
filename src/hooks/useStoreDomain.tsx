// Custom domains removed. This stub keeps existing imports working
// but always reports that we're on the main Eclipse domain.
import { ReactNode } from 'react';

interface StoreDomainContextType {
  isCustomStoreDomain: false;
  storeDomainData: null;
  loading: false;
}

const value: StoreDomainContextType = {
  isCustomStoreDomain: false,
  storeDomainData: null,
  loading: false,
};

export function StoreDomainProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useStoreDomain(): StoreDomainContextType {
  return value;
}

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { safeStorage } from '@/lib/safeStorage';

export interface CookiePreferences {
  essential: true; // Always true, cannot be disabled
  analytics: boolean;
  marketing: boolean;
}

interface CookieConsentContextType {
  hasConsented: boolean;
  preferences: CookiePreferences;
  showBanner: boolean;
  showSettings: boolean;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  updatePreferences: (prefs: Partial<Omit<CookiePreferences, 'essential'>>) => void;
  openSettings: () => void;
  closeSettings: () => void;
}

const STORAGE_KEY = 'eclipse_cookie_consent';

const defaultPreferences: CookiePreferences = {
  essential: true,
  analytics: false,
  marketing: false,
};

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined);

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [hasConsented, setHasConsented] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(defaultPreferences);
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Load saved preferences on mount
  useEffect(() => {
    const saved = safeStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as CookiePreferences;
        setPreferences({ ...parsed, essential: true });
        setHasConsented(true);
        setShowBanner(false);
      } catch {
        // Invalid data, show banner
        setShowBanner(true);
      }
    } else {
      // No saved preferences, show banner after a short delay
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const savePreferences = useCallback((prefs: CookiePreferences) => {
    safeStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    setPreferences(prefs);
    setHasConsented(true);
    setShowBanner(false);
    setShowSettings(false);
  }, []);

  const acceptAll = useCallback(() => {
    savePreferences({
      essential: true,
      analytics: true,
      marketing: true,
    });
  }, [savePreferences]);

  const rejectNonEssential = useCallback(() => {
    savePreferences({
      essential: true,
      analytics: false,
      marketing: false,
    });
  }, [savePreferences]);

  const updatePreferences = useCallback((prefs: Partial<Omit<CookiePreferences, 'essential'>>) => {
    const newPrefs: CookiePreferences = {
      ...preferences,
      ...prefs,
      essential: true,
    };
    savePreferences(newPrefs);
  }, [preferences, savePreferences]);

  const openSettings = useCallback(() => {
    setShowSettings(true);
  }, []);

  const closeSettings = useCallback(() => {
    setShowSettings(false);
  }, []);

  return (
    <CookieConsentContext.Provider
      value={{
        hasConsented,
        preferences,
        showBanner,
        showSettings,
        acceptAll,
        rejectNonEssential,
        updatePreferences,
        openSettings,
        closeSettings,
      }}
    >
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);
  if (context === undefined) {
    throw new Error('useCookieConsent must be used within a CookieConsentProvider');
  }
  return context;
}

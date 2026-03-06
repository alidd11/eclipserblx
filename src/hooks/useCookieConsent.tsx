import React, { createContext, useContext, useState, useEffect, useCallback, forwardRef } from 'react';
import { safeStorage } from '@/lib/safeStorage';
import { supabase } from '@/integrations/supabase/client';

export interface CookiePreferences {
  essential: true; // Always true, cannot be disabled
  analytics: boolean;
  marketing: boolean;
}

// Increment this when the privacy policy changes materially to trigger re-consent
export const CONSENT_VERSION = '1.0';

const STORAGE_KEY = 'eclipse_cookie_consent';
const CONSENT_VERSION_KEY = 'eclipse_consent_version';

const defaultPreferences: CookiePreferences = {
  essential: true,
  analytics: false,
  marketing: false,
};

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined);

export const CookieConsentProvider = forwardRef<HTMLDivElement, { children: React.ReactNode }>(function CookieConsentProvider({ children }, _ref) {
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
        const savedVersion = safeStorage.getItem(CONSENT_VERSION_KEY);
        
        // If consent version changed, re-show banner for re-consent
        if (savedVersion !== CONSENT_VERSION) {
          setShowBanner(true);
          return;
        }
        
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
    safeStorage.setItem(CONSENT_VERSION_KEY, CONSENT_VERSION);
    setPreferences(prefs);
    setHasConsented(true);
    setShowBanner(false);
    setShowSettings(false);

    // Record consent server-side for GDPR accountability (fire-and-forget)
    const visitorId = safeStorage.getItem('eclipse_visitor_id') || 'unknown';
    supabase.from('consent_records').insert({
      visitor_id: visitorId,
      consent_version: CONSENT_VERSION,
      preferences: prefs as unknown as Record<string, unknown>,
      action: prefs.analytics || prefs.marketing ? 'granted' : 'rejected_non_essential',
      user_agent: navigator.userAgent.substring(0, 500),
    }).then(({ error }) => {
      if (error) console.error('Failed to record consent:', error);
    });
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
});

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);
  if (context === undefined) {
    throw new Error('useCookieConsent must be used within a CookieConsentProvider');
  }
  return context;
}

import { useState, useCallback, useEffect } from 'react';
import { safeStorage } from '@/lib/safeStorage';

export type StaffTheme = 'dark' | 'slate' | 'oled';

const STAFF_THEME_KEY = 'staff-theme';

export function useStaffTheme() {
  const [activeTheme, setActiveTheme] = useState<StaffTheme>(() => {
    const saved = safeStorage.getItem(STAFF_THEME_KEY);
    if (saved === 'slate' || saved === 'oled' || saved === 'dark') {
      return saved;
    }
    return 'dark';
  });
  
  const [previewTheme, setPreviewTheme] = useState<StaffTheme | null>(null);
  
  const isPreviewActive = previewTheme !== null;
  const currentTheme = previewTheme ?? activeTheme;

  // Apply theme class to document
  useEffect(() => {
    const html = document.documentElement;
    
    // Remove all staff theme classes
    html.classList.remove('dark', 'slate', 'oled');
    
    // Add current theme class
    html.classList.add(currentTheme);
    
    return () => {
      // Cleanup: remove staff-specific themes, keep dark for next-themes
      html.classList.remove('slate', 'oled');
    };
  }, [currentTheme]);

  const setTheme = useCallback((theme: StaffTheme) => {
    setActiveTheme(theme);
    setPreviewTheme(null);
    safeStorage.setItem(STAFF_THEME_KEY, theme);
  }, []);

  const startPreview = useCallback((theme: StaffTheme) => {
    setPreviewTheme(theme);
  }, []);

  const endPreview = useCallback(() => {
    setPreviewTheme(null);
  }, []);

  return {
    activeTheme,
    previewTheme,
    currentTheme,
    isPreviewActive,
    setTheme,
    startPreview,
    endPreview,
  };
}

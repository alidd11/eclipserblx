import { useState, useCallback, useEffect } from 'react';
import { safeStorage } from '@/lib/safeStorage';

export type StaffTheme = 'purple' | 'ocean' | 'ember' | 'forest' | 'mono';

const STAFF_THEME_KEY = 'staff-theme';
const ALL_THEME_CLASSES = ['theme-ocean', 'theme-ember', 'theme-forest', 'theme-mono'];

export function useStaffTheme() {
  const [activeTheme, setActiveTheme] = useState<StaffTheme>(() => {
    const saved = safeStorage.getItem(STAFF_THEME_KEY);
    if (saved === 'purple' || saved === 'ocean' || saved === 'ember' || saved === 'forest' || saved === 'mono') {
      return saved;
    }
    return 'purple';
  });
  
  const [previewTheme, setPreviewTheme] = useState<StaffTheme | null>(null);
  
  const isPreviewActive = previewTheme !== null;
  const currentTheme = previewTheme ?? activeTheme;

  // Apply theme class to document
  useEffect(() => {
    const html = document.documentElement;
    
    // Remove all staff theme classes
    ALL_THEME_CLASSES.forEach(cls => html.classList.remove(cls));
    
    // Add current theme class (purple uses the default dark theme, no extra class needed)
    if (currentTheme !== 'purple') {
      html.classList.add(`theme-${currentTheme}`);
    }
    
    // Ensure dark mode is always on for admin
    if (!html.classList.contains('dark')) {
      html.classList.add('dark');
    }
    
    return () => {
      // Cleanup: remove all color theme classes
      ALL_THEME_CLASSES.forEach(cls => html.classList.remove(cls));
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

import { useState, useCallback, useEffect } from 'react';
import { safeStorage } from '@/lib/safeStorage';

export type StaffTheme = 'purple' | 'ocean' | 'ember' | 'forest' | 'mono';

const STAFF_THEME_KEY = 'staff-theme';
const ALL_THEME_CLASSES = ['theme-ocean', 'theme-ember', 'theme-forest', 'theme-mono'];
const STAFF_THEME_EVENT = 'staff-theme-change';

// NOTE: This hook can be mounted in multiple components (AdminLayout + StaffThemeCard).
// We must NOT remove theme classes when a child component unmounts, otherwise the theme
// disappears when leaving /admin/settings.
let mountedInstances = 0;

function parseTheme(value: string | null): StaffTheme {
  if (value === 'purple' || value === 'ocean' || value === 'ember' || value === 'forest' || value === 'mono') {
    return value;
  }
  return 'purple';
}

function applyThemeClass(theme: StaffTheme) {
  const html = document.documentElement;

  ALL_THEME_CLASSES.forEach((cls) => html.classList.remove(cls));
  if (theme !== 'purple') {
    html.classList.add(`theme-${theme}`);
  }
}

export function useStaffTheme() {
  const [activeTheme, setActiveTheme] = useState<StaffTheme>(() => parseTheme(safeStorage.getItem(STAFF_THEME_KEY)));
  const [previewTheme, setPreviewTheme] = useState<StaffTheme | null>(null);

  const isPreviewActive = previewTheme !== null;
  const currentTheme = previewTheme ?? activeTheme;

  // Track mounts so only the LAST unmount (leaving admin entirely) clears theme classes.
  useEffect(() => {
    mountedInstances += 1;

    return () => {
      mountedInstances = Math.max(0, mountedInstances - 1);
      if (mountedInstances === 0) {
        const html = document.documentElement;
        ALL_THEME_CLASSES.forEach((cls) => html.classList.remove(cls));
      }
    };
  }, []);

  // Apply theme class to document (works with light/dark mode from next-themes)
  useEffect(() => {
    applyThemeClass(currentTheme);
  }, [currentTheme]);

  // Keep multiple hook instances in sync (AdminLayout + Settings card)
  useEffect(() => {
    const handler = (event: Event) => {
      const detailTheme = (event as CustomEvent<{ theme?: StaffTheme }>).detail?.theme;
      const next = parseTheme(detailTheme ?? safeStorage.getItem(STAFF_THEME_KEY));
      setActiveTheme(next);
      setPreviewTheme(null);
    };

    window.addEventListener(STAFF_THEME_EVENT, handler as EventListener);
    return () => window.removeEventListener(STAFF_THEME_EVENT, handler as EventListener);
  }, []);

  const setTheme = useCallback((theme: StaffTheme) => {
    setActiveTheme(theme);
    setPreviewTheme(null);
    safeStorage.setItem(STAFF_THEME_KEY, theme);

    window.dispatchEvent(new CustomEvent(STAFF_THEME_EVENT, { detail: { theme } }));
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

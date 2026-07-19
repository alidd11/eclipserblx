import { useEffect } from 'react';

/**
 * Keeps the `dark` class on <html> in sync with the OS color-scheme setting.
 * index.html applies the initial class synchronously before first paint to
 * avoid a flash; this hook only handles live changes while the app is open
 * (e.g. the OS switches theme at sunset, or the user changes it in settings).
 * There is no manual toggle and no persisted override — system setting wins.
 */
export function useSystemTheme() {
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = (isDark: boolean) => {
      document.documentElement.classList.toggle('dark', isDark);
    };

    apply(media.matches);

    const handleChange = (e: MediaQueryListEvent) => apply(e.matches);
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);
}

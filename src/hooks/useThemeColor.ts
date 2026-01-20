import { useEffect } from 'react';
import { useTheme } from 'next-themes';

const THEME_COLORS: Record<string, string> = {
  light: '#f8f8fc',
  dark: '#0a0a0f',
  purple: '#0a0a0f',
  ocean: '#0a1214',      // hsl(200 25% 6%)
  ember: '#140d0a',      // hsl(15 25% 6%)
  forest: '#0a120b',     // hsl(140 25% 5%)
  mono: '#0d0d0d',       // hsl(0 0% 5%)
};

const THEME_CLASS_MAP: Record<string, string> = {
  'theme-ocean': 'ocean',
  'theme-ember': 'ember',
  'theme-forest': 'forest',
  'theme-mono': 'mono',
};

function getActiveStaffTheme(html: HTMLElement): string | null {
  for (const [cls, theme] of Object.entries(THEME_CLASS_MAP)) {
    if (html.classList.contains(cls)) {
      return theme;
    }
  }
  return null;
}

export function useThemeColor() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const html = document.documentElement;
    let activeTheme = resolvedTheme || 'dark';
    
    // Staff themes take precedence in admin routes
    const staffTheme = getActiveStaffTheme(html);
    if (staffTheme) {
      activeTheme = staffTheme;
    }
    
    const themeColor = THEME_COLORS[activeTheme] || THEME_COLORS.dark;

    // Update meta theme-color (browser UI)
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', themeColor);
    }

    // Update msapplication-TileColor
    const metaTileColor = document.querySelector('meta[name="msapplication-TileColor"]');
    if (metaTileColor) {
      metaTileColor.setAttribute('content', themeColor);
    }

    // For in-app safe areas, prefer our design tokens (matches Tailwind theme)
    document.documentElement.style.backgroundColor = 'hsl(var(--background))';
    document.body.style.backgroundColor = 'hsl(var(--background))';
  }, [resolvedTheme]);

  // Also observe class changes for staff theme switches
  useEffect(() => {
    const html = document.documentElement;
    
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'class') {
          let activeTheme = 'dark';
          
          const staffTheme = getActiveStaffTheme(html);
          if (staffTheme) {
            activeTheme = staffTheme;
          } else if (html.classList.contains('dark')) {
            activeTheme = 'dark';
          } else {
            activeTheme = 'light';
          }
          
          const themeColor = THEME_COLORS[activeTheme] || THEME_COLORS.dark;
          
          const metaThemeColor = document.querySelector('meta[name="theme-color"]');
          if (metaThemeColor) {
            metaThemeColor.setAttribute('content', themeColor);
          }
          
          const metaTileColor = document.querySelector('meta[name="msapplication-TileColor"]');
          if (metaTileColor) {
            metaTileColor.setAttribute('content', themeColor);
          }
        }
      }
    });
    
    observer.observe(html, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);
}

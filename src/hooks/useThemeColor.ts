import { useEffect } from 'react';
import { useTheme } from 'next-themes';

// Theme colors for light and dark variants
const THEME_COLORS: Record<string, { light: string; dark: string }> = {
  default: { light: '#f8f8fc', dark: '#0a0a0f' },
  purple: { light: '#f8f8fc', dark: '#0a0a0f' },
  ocean: { light: '#f5fafa', dark: '#0a1214' },
  ember: { light: '#fcf8f5', dark: '#140d0a' },
  forest: { light: '#f5fcf6', dark: '#0a120b' },
  mono: { light: '#fafafa', dark: '#0d0d0d' },
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

function isDarkMode(html: HTMLElement): boolean {
  return html.classList.contains('dark');
}

function getResolvedThemeColor(html: HTMLElement): string {
  const dark = isDarkMode(html);
  const staffTheme = getActiveStaffTheme(html);
  const colorTheme = staffTheme || 'default';
  const themeColors = THEME_COLORS[colorTheme] || THEME_COLORS.default;
  const fallbackColor = dark ? themeColors.dark : themeColors.light;
  const computedBackground = getComputedStyle(html).backgroundColor;

  return computedBackground && computedBackground !== 'rgba(0, 0, 0, 0)'
    ? computedBackground
    : fallbackColor;
}

function syncBrowserTheme(html: HTMLElement) {
  const themeColor = getResolvedThemeColor(html);

  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', themeColor);
  }

  const metaTileColor = document.querySelector('meta[name="msapplication-TileColor"]');
  if (metaTileColor) {
    metaTileColor.setAttribute('content', themeColor);
  }

  html.style.backgroundColor = themeColor;
  document.body.style.backgroundColor = themeColor;
}

export function useThemeColor() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const html = document.documentElement;
    syncBrowserTheme(html);
  }, [resolvedTheme]);

  // Also observe class changes for staff theme switches
  useEffect(() => {
    const html = document.documentElement;
    
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'class') {
          syncBrowserTheme(html);
        }
      }
    });
    
    observer.observe(html, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);
}

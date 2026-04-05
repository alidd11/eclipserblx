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
  const htmlBackground = getComputedStyle(html).backgroundColor;
  const bodyBackground = getComputedStyle(document.body).backgroundColor;
  const computedBackground = [htmlBackground, bodyBackground].find(
    (color) => color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent'
  );

  return computedBackground && computedBackground !== 'rgba(0, 0, 0, 0)'
    ? computedBackground
    : fallbackColor;
}

function upsertMetaTag(name: string, content: string) {
  let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;

  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', name);
    document.head.appendChild(meta);
  }

  meta.setAttribute('content', content);
}

function syncBrowserTheme(html: HTMLElement) {
  const themeColor = getResolvedThemeColor(html);
  const colorScheme = isDarkMode(html) ? 'dark' : 'light';

  upsertMetaTag('theme-color', themeColor);
  upsertMetaTag('msapplication-TileColor', themeColor);

  html.style.backgroundColor = themeColor;
  html.style.colorScheme = colorScheme;
  document.body.style.setProperty('background-color', themeColor);
  document.body.style.colorScheme = colorScheme;
  document.getElementById('root')?.style.setProperty('background-color', themeColor);
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

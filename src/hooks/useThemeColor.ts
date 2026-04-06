import { useEffect } from 'react';

// Theme colors for dark mode (app is dark-only)
const THEME_COLORS: Record<string, string> = {
  default: '#0a0a0f',
  purple: '#0a0a0f',
  ocean: '#0a1214',
  ember: '#140d0a',
  forest: '#0a120b',
  mono: '#0d0d0d',
};

const THEME_CLASS_MAP: Record<string, string> = {
  'theme-ocean': 'ocean',
  'theme-ember': 'ember',
  'theme-forest': 'forest',
  'theme-mono': 'mono',
};

let themeCssLoaded = false;

function loadThemeCSS() {
  if (themeCssLoaded) return;
  themeCssLoaded = true;
  import('../styles/themes.css');
}

function getActiveStaffTheme(html: HTMLElement): string | null {
  for (const [cls, theme] of Object.entries(THEME_CLASS_MAP)) {
    if (html.classList.contains(cls)) {
      return theme;
    }
  }
  return null;
}

function getResolvedThemeColor(html: HTMLElement): string {
  const staffTheme = getActiveStaffTheme(html);
  const colorTheme = staffTheme || 'default';
  return THEME_COLORS[colorTheme] || THEME_COLORS.default;
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
  const staffTheme = getActiveStaffTheme(html);
  
  // Lazy-load theme CSS only when a non-default theme is active
  if (staffTheme) {
    loadThemeCSS();
  }

  const themeColor = getResolvedThemeColor(html);

  upsertMetaTag('theme-color', themeColor);
  upsertMetaTag('msapplication-TileColor', themeColor);

  html.style.backgroundColor = themeColor;
  html.style.colorScheme = 'dark';
  document.body.style.setProperty('background-color', themeColor);
  document.body.style.colorScheme = 'dark';
  document.getElementById('root')?.style.setProperty('background-color', themeColor);
}

export function useThemeColor() {
  useEffect(() => {
    const html = document.documentElement;
    syncBrowserTheme(html);

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

import { useEffect } from 'react';

// Mirrors the --background token in index.css for each mode
export const THEME_COLOR_DARK = '#0a0a0f';
export const THEME_COLOR_LIGHT = '#fbfbfc';

function getResolvedThemeColor(html: HTMLElement): string {
  return html.classList.contains('dark') ? THEME_COLOR_DARK : THEME_COLOR_LIGHT;
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

  upsertMetaTag('theme-color', themeColor);
  upsertMetaTag('msapplication-TileColor', themeColor);

  const colorScheme = html.classList.contains('dark') ? 'dark' : 'light';
  html.style.backgroundColor = themeColor;
  html.style.colorScheme = colorScheme;
  document.body.style.setProperty('background-color', themeColor);
  document.body.style.colorScheme = colorScheme;
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

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

const THEME_COLORS: Record<string, string> = {
  light: '#f8f8fc',
  dark: '#0a0a0f',
  slate: '#161922',  // hsl(220 25% 10%)
  oled: '#000000',
};

export function useThemeColor() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    // Check for staff themes first (they add classes to documentElement)
    const html = document.documentElement;
    let activeTheme = resolvedTheme || 'dark';
    
    // Staff themes take precedence in admin routes
    if (html.classList.contains('slate')) {
      activeTheme = 'slate';
    } else if (html.classList.contains('oled')) {
      activeTheme = 'oled';
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
          
          if (html.classList.contains('slate')) {
            activeTheme = 'slate';
          } else if (html.classList.contains('oled')) {
            activeTheme = 'oled';
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

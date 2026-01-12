import { useEffect } from 'react';
import { useTheme } from 'next-themes';

const LIGHT_THEME_COLOR = '#f8f8fc';
const DARK_THEME_COLOR = '#0a0a0f';

export function useThemeColor() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const themeColor = resolvedTheme === 'light' ? LIGHT_THEME_COLOR : DARK_THEME_COLOR;

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
}

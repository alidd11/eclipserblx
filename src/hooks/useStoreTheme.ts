import { useMemo } from 'react';

interface StoreThemeInput {
  accent_color?: string | null;
  theme?: string | null;
}

interface StoreTheme {
  /** Resolved accent color, defaults to #8b5cf6 */
  accentColor: string;
  /** Whether the store uses a dark theme */
  isDarkTheme: boolean;
  /** Raw theme value */
  theme: string;
  /** Conditional class for dark-theme text */
  textClass: string;
  /** Conditional class for dark-theme muted text */
  mutedTextClass: string;
}

/**
 * Centralised hook for deriving store theme values.
 *
 * Eliminates repeated `accentColor`, `isDarkTheme` derivations
 * across StorePage, StoreAbout, StoreReviewsPage, StoreLayout, etc.
 */
export function useStoreTheme(store: StoreThemeInput | null | undefined): StoreTheme {
  return useMemo(() => {
    const accentColor = store?.accent_color || '#8b5cf6';
    const theme = store?.theme || 'default';
    const isDarkTheme = theme === 'dark';

    return {
      accentColor,
      isDarkTheme,
      theme,
      textClass: isDarkTheme ? 'text-foreground' : '',
      mutedTextClass: isDarkTheme ? 'text-zinc-300' : 'text-foreground',
    };
  }, [store?.accent_color, store?.theme]);
}

/**
 * Shared categorical chart palette. Values are defined per light/dark mode
 * in index.css (--chart-1 through --chart-10) so data-viz lines/bars stay
 * readable against both backgrounds instead of hardcoding one mode's hues.
 */
export const CHART_COLORS = {
  purple: 'hsl(var(--chart-1))',
  blue: 'hsl(var(--chart-2))',
  gold: 'hsl(var(--chart-3))',
  pink: 'hsl(var(--chart-4))',
  indigo: 'hsl(var(--chart-5))',
  teal: 'hsl(var(--chart-6))',
  green: 'hsl(var(--chart-7))',
  orange: 'hsl(var(--chart-8))',
  emerald: 'hsl(var(--chart-9))',
  green2: 'hsl(var(--chart-10))',
} as const;

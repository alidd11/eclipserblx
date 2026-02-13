/**
 * GlobalBackground - Fixed subtle texture background layer
 * Renders behind all content for a premium, immersive dark aesthetic
 * Inspired by Vino store's subtle banner feel
 */
export function GlobalBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Solid background base */}
      <div className="absolute inset-0 bg-background" />
      
      {/* Subtle noise texture for depth — like a faint fabric/grain */}
      <div 
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Very subtle radial vignette for depth */}
      <div 
        className="absolute inset-0 dark:opacity-100 opacity-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, transparent 50%, hsl(var(--background)) 100%)',
        }}
      />
    </div>
  );
}

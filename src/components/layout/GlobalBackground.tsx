/**
 * GlobalBackground - Fixed subtle texture background layer
 * Renders behind all content; fully theme-aware (light/dark via CSS vars)
 */
export function GlobalBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Solid background base */}
      <div className="absolute inset-0 bg-background" />
      
      {/* Subtle CSS noise texture for depth — avoids render-blocking SVG filter */}
      <div 
        className="absolute inset-0 opacity-[0.03] bg-noise"
      />

      {/* Very subtle radial vignette for depth */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, transparent 50%, hsl(var(--background)) 100%)',
        }}
      />
    </div>
  );
}

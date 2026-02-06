/**
 * GlobalBackground - Fixed animated gradient background layer
 * Renders behind all content to create a premium, immersive aesthetic
 */
export function GlobalBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Slow animated gradient background - 45s duration, reduced opacity */}
      <div 
        className="absolute inset-0 animate-hero-gradient-slow bg-[length:200%_200%] opacity-[0.18]"
        style={{
          backgroundImage: `linear-gradient(
            135deg,
            hsl(var(--primary)) 0%,
            hsl(var(--neon-blue)) 25%,
            hsl(var(--accent)) 50%,
            hsl(var(--neon-pink)) 75%,
            hsl(var(--primary)) 100%
          )`,
        }}
      />
      
      {/* Subtle geometric grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
      
      {/* Base background color underneath for proper theming */}
      <div className="absolute inset-0 -z-10 bg-background" />
    </div>
  );
}

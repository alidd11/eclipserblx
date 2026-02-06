export function HeroBanner() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Animated gradient background */}
      <div 
        className="absolute inset-0 animate-hero-gradient bg-[length:200%_200%]"
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
      
      {/* Geometric grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />
      
      {/* Diagonal lines accent */}
      <div 
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 20px,
            hsl(var(--foreground)) 20px,
            hsl(var(--foreground)) 21px
          )`,
        }}
      />
      
      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/50 to-background/90" />
      
      {/* Bottom fade to content */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}

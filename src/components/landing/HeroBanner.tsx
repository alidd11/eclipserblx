export function HeroBanner() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Subtle radial glow to add depth without blocking global gradient */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 30%, hsl(var(--primary) / 0.3) 0%, transparent 70%)`,
        }}
      />
      
      
      {/* Soft bottom fade to content - very subtle */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/50 to-transparent" />
    </div>
  );
}

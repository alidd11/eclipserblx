import { useState } from 'react';

// Hero image served from public/ so the browser can discover it from the initial HTML
const heroBg = '/hero-bg.webp';

export function HeroBanner() {
  // Sync mobile detection to prevent hero image request on first render.
  // useState initializer runs synchronously before first paint.
  const [isMobile] = useState(() => 
    typeof window !== 'undefined' && window.innerWidth < 768
  );

  return (
    <div className="absolute inset-x-0 top-0 h-[420px] sm:h-[480px] overflow-hidden">
      {isMobile ? (
        <div className="absolute inset-0 bg-gradient-to-br from-background via-card to-background" />
      ) : (
        <img
          src={heroBg}
          alt=""
          width={1920}
          height={480}
          fetchPriority="high"
          decoding="sync"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-background/55" />

      {/* Left text-protection gradient */}
      <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-background/70 to-transparent" />

      {/* Bottom hard fade into page background */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background via-background/90 to-transparent" />

      {/* Top subtle fade under navbar */}
      <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-background/40 to-transparent" />
    </div>
  );
}

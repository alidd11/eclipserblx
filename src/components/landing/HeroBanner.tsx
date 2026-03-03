import { useState } from 'react';

const heroBgDesktop = '/hero-bg.webp';
const heroBgMobile = '/hero-bg-mobile.webp';

export function HeroBanner() {
  const [isMobile] = useState(() => 
    typeof window !== 'undefined' && window.innerWidth < 768
  );

  return (
    <div className="absolute inset-x-0 top-0 h-[420px] sm:h-[480px] overflow-hidden">
      <img
        src={isMobile ? heroBgMobile : heroBgDesktop}
        alt=""
        width={isMobile ? 768 : 1920}
        height={isMobile ? 432 : 480}
        fetchPriority="high"
        decoding="sync"
        className="absolute inset-0 w-full h-full object-cover"
      />

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

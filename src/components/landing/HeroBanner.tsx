const heroBgDesktop = '/hero-bg.webp';
const heroBgMobile = '/hero-bg-mobile.webp';

export function HeroBanner() {
  return (
    <div className="absolute inset-x-0 top-0 h-full overflow-hidden">
      <picture>
        <source media="(min-width: 768px)" srcSet={heroBgDesktop} type="image/webp" />
        <img
          src={heroBgMobile}
          alt=""
          width={750}
          height={460}
          fetchPriority="high"
          loading="eager"
          decoding="sync"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </picture>

      {/* Radial spotlight overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, hsl(235 86% 65% / 0.08), transparent 70%), hsl(220 8% 6% / 0.55)',
        }}
      />

      {/* Bottom fade into page background */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />

      {/* Shimmer line at bottom edge */}
      <div className="hero-shimmer-line" />

      {/* Top subtle fade under navbar */}
      <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-background/40 to-transparent" />
    </div>
  );
}

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
          width={375}
          height={420}
          fetchPriority="high"
          loading="eager"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </picture>

      {/* Single clean overlay */}
      <div className="absolute inset-0 bg-background/50" />

      {/* Bottom fade into page background */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />

      {/* Top subtle fade under navbar */}
      <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-background/40 to-transparent" />
    </div>
  );
}

import { Link } from 'react-router-dom';
import { Store, ArrowRight, Percent, Coins } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export function PromotionCarousel() {
  const { t } = useTranslation();
  const [isReady, setIsReady] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, skipSnaps: false },
    [Autoplay({ delay: 8000, stopOnInteraction: false, stopOnMouseEnter: true })]
  );
  const [selectedIndex, setSelectedIndex] = useState(0);

  const promotions = [
    {
      id: 'affiliate',
      icon: Percent,
      label: 'AFFILIATES',
      title: t('landing.affiliateTitle'),
      description: t('landing.affiliateDesc'),
      cta: t('landing.affiliateCta'),
      link: '/affiliate',
      accentClass: 'bg-primary',
    },
    {
      id: 'seller',
      icon: Store,
      label: 'SELLERS',
      title: t('landing.sellerTitle'),
      description: t('landing.sellerDesc'),
      cta: t('landing.sellerCta'),
      link: '/account',
      accentClass: 'bg-amber-500',
    },
    {
      id: 'credits',
      icon: Coins,
      label: 'CREDITS',
      title: 'Save on Fees with Eclipse Credits',
      description: 'Pay with credits to skip transaction fees and check out instantly.',
      cta: 'Top Up',
      link: '/wallet',
      accentClass: 'bg-emerald-500',
    },
  ];

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setIsReady(true);
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    onSelect();
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollTo = useCallback(
    (index: number) => emblaApi && emblaApi.scrollTo(index),
    [emblaApi]
  );

  const currentPromo = promotions[selectedIndex] || promotions[0];

  const renderSlide = (promo: typeof promotions[0]) => (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="flex items-center gap-4 min-w-0">
        {/* Left accent bar + icon */}
        <div className="flex items-center gap-3 shrink-0">
          <div className={`w-0.5 h-10 ${promo.accentClass} rounded-full`} />
          <promo.icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <span className={`text-[10px] font-bold tracking-widest uppercase ${promo.id === 'seller' ? 'text-amber-500' : promo.id === 'credits' ? 'text-emerald-500' : 'text-primary'} block mb-0.5`}>{promo.label}</span>
          <h3 className="font-semibold text-sm text-foreground truncate">{promo.title}</h3>
          <p className="text-xs text-muted-foreground line-clamp-1 max-w-xs mt-0.5">{promo.description}</p>
        </div>
      </div>
      <Link
        to={promo.link}
        className="shrink-0 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        {promo.cta}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );

  return (
    <div className="border border-border bg-card rounded-md overflow-hidden">
      <div
        ref={emblaRef}
        className={`overflow-hidden transition-opacity duration-300 ${isReady ? 'opacity-100' : 'opacity-0 absolute'}`}
      >
        <div className="flex">
          {promotions.map((promo) => (
            <div key={promo.id} className="flex-[0_0_100%] min-w-0">
              {renderSlide(promo)}
            </div>
          ))}
        </div>
      </div>

      {!isReady && renderSlide(currentPromo)}

      {/* Dots */}
      <div className="flex justify-center gap-1.5 pb-3">
        {promotions.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollTo(index)}
            className={`h-0.5 rounded-full transition-all duration-300 ${
              index === selectedIndex ? 'bg-foreground w-5' : 'bg-border w-2'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

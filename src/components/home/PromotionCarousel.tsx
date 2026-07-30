import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Users, Store, Coins } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export function PromotionCarousel() {
  const { t } = useTranslation();
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, skipSnaps: false },
    [Autoplay({ delay: 6000, stopOnInteraction: false, stopOnMouseEnter: true })]
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const promotions = [
    {
      id: 'affiliate',
      title: t('landing.affiliateTitle'),
      description: t('landing.affiliateDesc'),
      link: '/affiliate',
      icon: Users,
      accent: 'from-primary/15 to-primary/7',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      dotColor: 'bg-primary',
    },
    {
      id: 'seller',
      title: t('landing.sellerTitle'),
      description: t('landing.sellerDesc'),
      link: '/account',
      icon: Store,
      accent: 'from-success/15 to-success/7',
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
      dotColor: 'bg-success',
    },
    {
      id: 'credits',
      title: 'SAVE ON FEES WITH ECLIPSE CREDITS',
      description: 'Pay with credits to skip transaction fees and check out instantly.',
      link: '/credits',
      icon: Coins,
      accent: 'from-warning/15 to-warning/7',
      iconBg: 'bg-warning/10',
      iconColor: 'text-warning',
      dotColor: 'bg-warning',
    },
  ];

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setProgress(0);
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    onSelect();
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Autoplay progress bar
  useEffect(() => {
    const duration = 6000;
    const interval = 50;
    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (interval / duration) * 100;
        return next >= 100 ? 100 : next;
      });
    }, interval);
    return () => clearInterval(timer);
  }, [selectedIndex]);

  const scrollTo = useCallback(
    (index: number) => emblaApi && emblaApi.scrollTo(index),
    [emblaApi]
  );

  const renderSlide = (promo: typeof promotions[0]) => {
    const Icon = promo.icon;
    return (
      <Link
        to={promo.link}
        className={`group flex items-center justify-between gap-4 px-5 py-5 transition-[color,background-color,border-color,box-shadow,transform,opacity] ease-emphasized duration-300 bg-gradient-to-r ${promo.accent}`}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className={`w-10 h-10 rounded-xl ${promo.iconBg} flex items-center justify-center shrink-0 transition-transform ease-emphasized duration-300`}>
            <Icon className={`h-4.5 w-4.5 ${promo.iconColor}`} />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-[13px] text-foreground tracking-wide leading-snug uppercase">
              {promo.title}
            </h2>
            <p className="text-xs text-foreground/70 line-clamp-1 mt-0.5 max-w-sm">
              {promo.description}
            </p>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="border border-border bg-card rounded-lg overflow-hidden shadow-sm" role="region" aria-roledescription="carousel" aria-label="Promotions">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex" aria-live="off">
          {promotions.map((promo, i) => (
            <div key={promo.id} className="flex-[0_0_100%] min-w-0" role="group" aria-roledescription="slide" aria-label={`Slide ${i + 1} of ${promotions.length}: ${promo.title}`}>
              {renderSlide(promo)}
            </div>
          ))}
        </div>
      </div>

      {/* Progress track */}
      <div className="h-[2px] bg-border/50">
        <div
          className="h-full transition-[width] duration-100 ease-linear rounded-r-full"
          style={{
            width: `${progress}%`,
            backgroundColor: `var(--foreground)`,
            opacity: 0.3,
          }}
        />
      </div>
    </div>
  );
}

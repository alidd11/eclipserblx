import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, ShoppingCart, Star, Users, Calendar } from 'lucide-react';

interface StoreStatsBarProps {
  productCount: number;
  totalSales: number;
  averageRating?: number | null;
  followerCount: number;
  memberSince?: string;
  accentColor: string;
  storeSlug: string;
  reviewCount?: number;
}

function AnimatedCounter({ 
  end, 
  duration = 1500,
  suffix = '',
  decimals = 0 
}: { 
  end: number; 
  duration?: number;
  suffix?: string;
  decimals?: number;
}) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const elementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted || end === 0) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing function for smooth deceleration
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      
      const currentValue = easeOutQuart * end;
      setCount(decimals > 0 ? parseFloat(currentValue.toFixed(decimals)) : Math.floor(currentValue));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [hasStarted, end, duration, decimals]);

  return (
    <span ref={elementRef}>
      {decimals > 0 ? count.toFixed(decimals) : count.toLocaleString()}{suffix}
    </span>
  );
}

export function StoreStatsBar({
  productCount,
  totalSales,
  averageRating,
  followerCount,
  memberSince,
  accentColor,
  storeSlug,
  reviewCount,
}: StoreStatsBarProps) {
  const memberYear = memberSince ? new Date(memberSince).getFullYear() : null;
  const currentYear = new Date().getFullYear();
  const yearsActive = memberYear ? currentYear - memberYear : null;

  const stats = [
    ...(averageRating ? [{
      icon: Star,
      value: averageRating,
      label: 'Rating',
      suffix: '',
      decimals: 1,
      isStar: true,
      isClickable: true,
      href: `/store/${storeSlug}/reviews`,
    }] : []),
    {
      icon: Users,
      value: followerCount,
      label: 'Followers',
      suffix: '',
    },
    ...(yearsActive !== null && yearsActive >= 1 ? [{
      icon: Calendar,
      value: yearsActive,
      label: yearsActive === 1 ? 'Year' : 'Years',
      suffix: '',
    }] : []),
  ];

  return (
    <div className="w-full py-3">
      <div 
        className="rounded-xl border bg-card/50 backdrop-blur-sm px-4 py-3"
        style={{ borderColor: `${accentColor}30` }}
      >
        {/* Single line horizontal layout */}
        <div className="flex items-center justify-center gap-4 sm:gap-6 md:gap-8 overflow-x-auto">
          {stats.map((stat, index) => {
            const StatContent = (
              <div 
                className={`flex items-center gap-2 whitespace-nowrap ${stat.isClickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
              >
                <stat.icon 
                  className="h-4 w-4 flex-shrink-0"
                  style={{ color: accentColor }}
                  fill={stat.isStar ? accentColor : 'none'}
                />
                <span 
                  className="font-bold text-sm sm:text-base"
                  style={{ color: accentColor }}
                >
                  <AnimatedCounter 
                    end={stat.value} 
                    suffix={stat.suffix}
                    decimals={stat.decimals || 0}
                  />
                </span>
                <span className="text-xs sm:text-sm text-muted-foreground">
                  {stat.label}
                </span>
                {/* Separator dot */}
                {index < stats.length - 1 && (
                  <span 
                    className="hidden sm:block w-1 h-1 rounded-full ml-2"
                    style={{ backgroundColor: `${accentColor}50` }}
                  />
                )}
              </div>
            );

            return stat.isClickable && stat.href ? (
              <Link key={stat.label} to={stat.href}>
                {StatContent}
              </Link>
            ) : (
              <div key={stat.label}>
                {StatContent}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { useRef, useState, useEffect } from 'react';
import { Package, ShoppingCart, Star, Users, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StoreStatsBarProps {
  productCount: number;
  totalSales: number;
  averageRating?: number | null;
  followerCount: number;
  memberSince?: string;
  accentColor: string;
}

function AnimatedCounter({ 
  end, 
  duration = 2000,
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
}: StoreStatsBarProps) {
  const memberYear = memberSince ? new Date(memberSince).getFullYear() : null;
  const currentYear = new Date().getFullYear();
  const yearsActive = memberYear ? currentYear - memberYear : null;

  const stats = [
    {
      icon: Package,
      value: productCount,
      label: 'Products',
      suffix: '',
    },
    {
      icon: ShoppingCart,
      value: totalSales,
      label: 'Sales',
      suffix: '+',
    },
    ...(averageRating ? [{
      icon: Star,
      value: averageRating,
      label: 'Rating',
      suffix: '',
      decimals: 1,
      isStar: true,
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
      label: yearsActive === 1 ? 'Year Active' : 'Years Active',
      suffix: '',
    }] : []),
  ];

  return (
    <div className="w-full py-4">
      <div 
        className="rounded-xl border bg-card/50 backdrop-blur-sm p-4 md:p-6"
        style={{ borderColor: `${accentColor}30` }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {stats.map((stat, index) => (
            <div 
              key={stat.label}
              className={cn(
                "flex flex-col items-center text-center gap-1",
                index >= 4 && "hidden lg:flex"
              )}
            >
              <div 
                className="p-2 rounded-lg mb-1"
                style={{ backgroundColor: `${accentColor}15` }}
              >
                <stat.icon 
                  className="h-5 w-5"
                  style={{ color: accentColor }}
                  fill={stat.isStar ? accentColor : 'none'}
                />
              </div>
              <span 
                className="text-2xl md:text-3xl font-bold"
                style={{ color: accentColor }}
              >
                <AnimatedCounter 
                  end={stat.value} 
                  suffix={stat.suffix}
                  decimals={stat.decimals || 0}
                />
              </span>
              <span className="text-xs md:text-sm text-muted-foreground">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

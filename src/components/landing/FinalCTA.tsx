import { PrefetchLink as Link } from '@/components/PrefetchLink';
import { Button } from '@/components/ui/button';
import { Store } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export function FinalCTA() {
  return (
    <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      <ScrollReveal direction="up" distance={16} duration={0.35}>
        <div className="relative p-8 sm:p-12 text-center rounded-2xl overflow-hidden bg-card">
          {/* Gradient border effect */}
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              padding: '1px',
              background: 'linear-gradient(135deg, hsl(235 86% 65% / 0.4), hsl(215 85% 55% / 0.2), hsl(220 5% 15% / 0.6))',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
            }}
          />
          <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-tight mb-3">
            Turn your creations into revenue
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mb-6 max-w-lg mx-auto leading-relaxed">
            Open a free store in minutes. Reach thousands of buyers with lower fees and instant payouts.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/sell">
              <Button size="lg" className="h-12 px-8 text-sm font-semibold">
                <Store className="mr-2 h-4 w-4" />
                Open Your Store
              </Button>
            </Link>
          </div>
          <p className="text-[11px] text-muted-foreground/60 mt-5">
            No listing fees · Lower commission · Instant payouts
          </p>
        </div>
      </ScrollReveal>
    </section>
  );
}

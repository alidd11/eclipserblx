import { PrefetchLink as Link } from '@/components/PrefetchLink';
import { Button } from '@/components/ui/button';
import { Store } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export function FinalCTA() {
  return (
    <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
      <ScrollReveal direction="up" distance={16} duration={0.35}>
        <div className="relative p-8 sm:p-14 text-center rounded-2xl overflow-hidden bg-card border border-border/60">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold tracking-tight mb-3 text-foreground">
            Turn your creations into revenue
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mb-7 max-w-lg mx-auto leading-relaxed">
            Open a free store in minutes. Reach thousands of buyers with lower fees and instant payouts.
          </p>
          <div className="flex items-center justify-center">
            <Link to="/sell">
              <Button size="lg" className="h-12 px-8 text-sm font-semibold">
                <Store className="mr-2 h-4 w-4" />
                Open your store
              </Button>
            </Link>
          </div>
          <p className="text-[11px] text-muted-foreground/70 mt-5 tracking-wide">
            No listing fees · Lower commission · Instant payouts
          </p>
        </div>
      </ScrollReveal>
    </section>
  );
}

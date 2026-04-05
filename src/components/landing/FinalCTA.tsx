import { PrefetchLink as Link } from '@/components/PrefetchLink';
import { Button } from '@/components/ui/button';
import { Store } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export function FinalCTA() {
  return (
    <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      <ScrollReveal direction="up" distance={16} duration={0.35}>
        <div className="p-6 sm:p-8 text-center rounded-xl border border-border/50 bg-card/50">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
            Turn your creations into revenue
          </h2>
          <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
            Open a free store in minutes. Reach thousands of buyers with lower fees and instant payouts.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/sell">
              <Button size="sm" className="h-10 px-6 text-sm font-semibold">
                <Store className="mr-2 h-4 w-4" />
                Open Your Store
              </Button>
            </Link>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}

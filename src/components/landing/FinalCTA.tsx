import { PrefetchLink as Link } from '@/components/PrefetchLink';
import { Button } from '@/components/ui/button';
import { ArrowRight, Store } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export function FinalCTA() {
  return (
    <section className="px-4 sm:px-6 lg:px-8 py-8">
      <ScrollReveal direction="up" distance={16} duration={0.35}>
        <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-6 sm:p-8 text-center">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
            Ready to start?
          </h2>
          <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
            Join thousands of Roblox creators buying and selling on Eclipse.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/products">
              <Button size="sm" className="h-10 px-6 text-sm font-semibold">
                Browse Marketplace
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/sell">
              <Button size="sm" variant="outline" className="h-10 px-6 text-sm font-semibold">
                <Store className="mr-2 h-4 w-4" />
                Start Selling
              </Button>
            </Link>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}

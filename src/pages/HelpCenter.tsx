import { MainLayout } from '@/components/layout/MainLayout';
import { SITE_NAME } from '@/lib/constants';
import { usePageTracking } from '@/hooks/usePageTracking';
import { usePageMeta } from '@/hooks/usePageMeta';
import { Link } from 'react-router-dom';
import {
  HelpCircle,
  ShoppingCart,
  Store,
  ChevronRight,
} from 'lucide-react';

export default function HelpCenter() {
  usePageTracking({ pagePath: '/help-center' });
  usePageMeta({
    title: 'Help Center',
    description: `Find answers about buying, selling, downloads, payments, Discord bots, and more on ${SITE_NAME}.`,
    canonicalPath: '/help-center',
  });

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 md:py-12 max-w-4xl">
        <header className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <HelpCircle className="h-4 w-4" />
            Help Center
          </div>
          <h1 className="text-4xl font-display font-bold mb-4">How can we help?</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Choose a section below to find the answers you need.
          </p>
        </header>

        <div className="grid sm:grid-cols-2 gap-6">
          <Link
            to="/help-center/buyers"
            className="group bg-card border border-border rounded-xl p-8 hover:border-primary/50 transition-all"
          >
            <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500 w-fit mb-5">
              <ShoppingCart className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
              Buyer Help Center
            </h2>
            <p className="text-muted-foreground text-sm mb-4">
              Purchasing, downloads, payments, refunds, bot setup, and account help.
            </p>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
              Browse articles <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Link>

          <Link
            to="/help-center/sellers"
            className="group bg-card border border-border rounded-xl p-8 hover:border-primary/50 transition-all"
          >
            <div className="p-3 rounded-lg bg-primary/10 text-primary w-fit mb-5">
              <Store className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
              Seller Help Center
            </h2>
            <p className="text-muted-foreground text-sm mb-4">
              Store setup, earnings, payouts, product listings, bot licensing, and IP protection.
            </p>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
              Browse articles <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}

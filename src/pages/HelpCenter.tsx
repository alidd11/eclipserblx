import { MainLayout } from '@/components/layout/MainLayout';
import { SITE_NAME } from '@/lib/constants';
import { usePageTracking } from '@/hooks/usePageTracking';
import { usePageMeta } from '@/hooks/usePageMeta';
import { Link } from 'react-router-dom';
import { useDiscordUrl } from '@/hooks/useDiscordUrl';
import {
  ShoppingCart,
  Store,
  ArrowRight,
  MessageCircle,
  Users,
  LifeBuoy,
  Search,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const buyerTopics = [
  'Downloads & access',
  'Payments & refunds',
  'Discord bot setup',
  'Account security',
];

const sellerTopics = [
  'Store setup',
  'Payouts & earnings',
  'Product listings',
  'IP protection',
];

export default function HelpCenter() {
  usePageTracking({ pagePath: '/help-center' });
  usePageMeta({
    title: 'Help Center',
    description: `Find answers about buying, selling, downloads, payments, Discord bots, and more on ${SITE_NAME}.`,
    canonicalPath: '/help-center',
  });
  const { discordUrl } = useDiscordUrl();
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) navigate(`/faq?search=${encodeURIComponent(q.trim())}`);
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-10 md:py-16 max-w-5xl">
        {/* Editorial hero */}
        <div className="grid md:grid-cols-[1.15fr_1fr] gap-10 md:gap-14 items-end mb-12 md:mb-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-4">
              Help Center
            </p>
            <h1 className="font-display font-bold text-4xl md:text-5xl leading-[1.05] tracking-tight text-foreground">
              Answers, on your terms.
            </h1>
            <p className="mt-5 text-muted-foreground text-base md:text-lg max-w-lg leading-relaxed">
              Two paths, one destination. Pick the side you're on — or search the entire library at once.
            </p>
          </div>

          <form onSubmit={onSearch} className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search every article…"
              className="pl-11 h-12 bg-card border-border text-base"
              aria-label="Search help articles"
            />
          </form>
        </div>

        {/* Two-path editorial cards */}
        <div className="grid md:grid-cols-2 gap-4 md:gap-5 mb-16">
          <Link
            to="/help-center/buyers"
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-7 md:p-8 transition-colors hover:border-foreground/20"
          >
            <div className="flex items-center justify-between mb-8">
              <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                01 — Buyer
              </span>
              <ShoppingCart className="h-5 w-5 text-muted-foreground" />
            </div>
            <h2 className="font-display text-2xl font-semibold mb-2 text-foreground">
              I'm buying
            </h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Purchasing, downloads, payments, refunds, bot setup, account help.
            </p>
            <ul className="space-y-1.5 mb-8">
              {buyerTopics.map((t) => (
                <li key={t} className="text-sm text-foreground/80 flex items-center gap-2">
                  <span className="h-px w-4 bg-border" />
                  {t}
                </li>
              ))}
            </ul>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
              Browse buyer articles
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>

          <Link
            to="/help-center/sellers"
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-7 md:p-8 transition-colors hover:border-foreground/20"
          >
            <div className="flex items-center justify-between mb-8">
              <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                02 — Seller
              </span>
              <Store className="h-5 w-5 text-muted-foreground" />
            </div>
            <h2 className="font-display text-2xl font-semibold mb-2 text-foreground">
              I'm selling
            </h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Store setup, earnings, payouts, listings, bot licensing, IP protection.
            </p>
            <ul className="space-y-1.5 mb-8">
              {sellerTopics.map((t) => (
                <li key={t} className="text-sm text-foreground/80 flex items-center gap-2">
                  <span className="h-px w-4 bg-border" />
                  {t}
                </li>
              ))}
            </ul>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
              Browse seller articles
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        </div>

        {/* Direct contact rail */}
        <div className="border-t border-border pt-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">
                Still stuck?
              </p>
              <h3 className="font-display text-xl font-semibold text-foreground">
                Talk to a human.
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  const btn = document.querySelector('[data-chat-widget]');
                  if (btn instanceof HTMLElement) btn.click();
                }}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <MessageCircle className="h-4 w-4" /> Live chat
              </button>
              <a
                href={discordUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <Users className="h-4 w-4" /> Discord
              </a>
              <Link
                to="/support"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <LifeBuoy className="h-4 w-4" /> Open a ticket
              </Link>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

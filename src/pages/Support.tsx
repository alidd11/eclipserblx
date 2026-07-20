import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useDiscordUrl } from '@/hooks/useDiscordUrl';
import { CreateTicketDialog } from '@/components/support/CreateTicketDialog';
import { GuestSupportForm } from '@/components/support/GuestSupportForm';
import { useAuth } from '@/hooks/useAuth';
import { usePageMeta } from '@/hooks/usePageMeta';
import {
  Ticket,
  FileQuestion,
  Download,
  CreditCard,
  ShieldCheck,
  MessageCircle,
  Package,
  ChevronDown,
  ArrowRight,
  Users,
  Clock,
} from 'lucide-react';

const helpTopics = [
  {
    icon: Download,
    title: 'Downloads & Products',
    description: 'Accessing purchases, cooldowns, compatibility, re-downloads.',
    articles: [
      'How to access your downloads',
      'Understanding the 48-hour download cooldown',
      'Product compatibility requirements',
      'Re-downloading purchased products',
    ],
  },
  {
    icon: CreditCard,
    title: 'Payments & Orders',
    description: 'Methods, invoices, discounts, order history, recovery.',
    articles: [
      'Accepted payment methods',
      'How to apply discount codes',
      'Viewing your order history',
      'Payment security information',
      'Recover a missing order',
    ],
  },
  {
    icon: ShieldCheck,
    title: 'Account & Security',
    description: 'Sign-in, passwords, profile, two-factor.',
    articles: [
      'Creating your account',
      'Resetting your password',
      'Updating account information',
      'Two-factor authentication',
    ],
  },
  {
    icon: FileQuestion,
    title: 'Refunds & Returns',
    description: 'Policy, eligibility, requesting, processing times.',
    articles: [
      'Understanding our refund policy',
      'Eligibility for refunds',
      'How to request a refund',
      'Refund processing times',
    ],
  },
];

export default function Support() {
  const { discordUrl } = useDiscordUrl();
  usePageMeta({
    title: 'Support',
    description: 'Get help with Eclipse. Open a ticket, chat with our team, or browse help topics.',
    canonicalPath: '/support',
  });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [guestFormOpen, setGuestFormOpen] = useState(false);

  const openTicket = () => {
    if (user) setCreateDialogOpen(true);
    else navigate('/auth');
  };
  const openLiveChat = () => {
    const btn = document.querySelector('[data-chat-widget]');
    if (btn instanceof HTMLElement) btn.click();
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-10 md:py-16 max-w-5xl">
        {/* Hero + primary action panel */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden mb-12">
          <div className="grid md:grid-cols-[1.3fr_1fr]">
            <div className="p-7 md:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">
                Support Centre
              </p>
              <h1 className="font-display font-bold text-3xl md:text-4xl leading-[1.1] tracking-tight text-foreground">
                Get help, fast.
              </h1>
              <p className="mt-4 text-muted-foreground text-base leading-relaxed max-w-md">
                Open a ticket and a human on our team will pick it up. Or jump into live chat if it's urgent.
              </p>
              <div className="flex flex-wrap gap-2 mt-6">
                <button
                  onClick={openTicket}
                  className="inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  <Ticket className="h-4 w-4" /> Submit a ticket
                </button>
                <button
                  onClick={openLiveChat}
                  className="inline-flex items-center gap-2 h-11 px-5 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  <MessageCircle className="h-4 w-4" /> Live chat
                </button>
              </div>
            </div>

            {/* Response-time / channel rail */}
            <div className="border-t md:border-t-0 md:border-l border-border bg-muted/30 p-7 md:p-8 grid content-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Typical reply
                  </span>
                </div>
                <p className="text-foreground text-sm">
                  Live chat: minutes. Tickets: within a business day.
                </p>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center gap-3 text-sm">
                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                <a
                  href={discordUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground hover:underline"
                >
                  Ask the Discord community
                </a>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <FileQuestion className="h-4 w-4 text-muted-foreground shrink-0" />
                <Link to="/faq" className="text-foreground hover:underline">
                  Browse the FAQ
                </Link>
              </div>
              {user && (
                <div className="flex items-center gap-3 text-sm">
                  <Ticket className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Link to="/support/tickets" className="text-foreground hover:underline">
                    My open tickets
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Help topics */}
        <div className="mb-12">
          <div className="flex items-baseline justify-between mb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-1">
                Help topics
              </p>
              <h2 className="font-display text-2xl font-semibold text-foreground">
                Browse by category
              </h2>
            </div>
            <Link to="/faq" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              All FAQs <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {helpTopics.map((cat, i) => (
              <div
                key={cat.title}
                className="group rounded-xl border border-border bg-card p-6 transition-colors hover:border-foreground/20"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="h-8 w-8 rounded-lg border border-border bg-background flex items-center justify-center">
                    <cat.icon className="h-4 w-4 text-foreground" />
                  </div>
                  <h3 className="font-semibold text-foreground">{cat.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  {cat.description}
                </p>
                <ul className="space-y-1.5">
                  {cat.articles.map((a) => {
                    const recover = a === 'Recover a missing order';
                    return (
                      <li key={a}>
                        <Link
                          to={recover ? '/recover-order' : `/faq?search=${encodeURIComponent(a)}`}
                          className="group/link text-sm text-foreground/80 hover:text-foreground inline-flex items-center gap-2"
                        >
                          <span className="h-px w-3 bg-border transition-all group-hover/link:w-5 group-hover/link:bg-foreground" />
                          {a}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Order recovery + guest form as a two-up utility row */}
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="rounded-xl border border-border bg-card p-6 flex items-start gap-4">
            <Package className="h-5 w-5 text-foreground mt-0.5 shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Missing an order?</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-3 leading-relaxed">
                Completed a payment but can't see your purchase? Recover it instantly.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to="/recover-order">Recover order</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <button
              onClick={() => setGuestFormOpen((v) => !v)}
              className="w-full p-6 flex items-start gap-4 text-left hover:bg-muted/30 transition-colors"
            >
              <ShieldCheck className="h-5 w-5 text-foreground mt-0.5 shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Can't sign in?</h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  Submit a support ticket without an account.
                </p>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground mt-1 transition-transform ${
                  guestFormOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            {guestFormOpen && (
              <div className="p-6 border-t border-border">
                <GuestSupportForm />
              </div>
            )}
          </div>
        </div>

        <CreateTicketDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      </div>
    </MainLayout>
  );
}

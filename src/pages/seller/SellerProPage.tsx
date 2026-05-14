import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Crown, Check, X, Zap, Shield, Image, FileText, Megaphone, 
  Star, Package, Percent, Calendar, Loader2, ExternalLink,
  Palette, Link2, BarChart3, Tag, Clock, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSellerSubscription, SellerBillingPeriod } from '@/hooks/useSellerSubscription';
import { toast } from 'sonner';
import { format } from '@/lib/dateUtils';
import { formatGBP } from '@/lib/formatters';

const highlights = [
  { icon: Percent, title: 'Lower Commission', description: 'Keep 90% of every sale — down from 85% on Free.' },
  { icon: Package, title: 'Unlimited Products', description: 'No cap on listings. Scale your catalogue without limits.' },
  { icon: Zap, title: 'Priority Review', description: 'Products reviewed faster so you can start selling sooner.' },
];

interface FeatureRow {
  label: string;
  free: string | boolean;
  pro: string | boolean;
  icon: React.ElementType;
}

const featureGroups: { section: string; rows: FeatureRow[] }[] = [
  {
    section: 'Selling',
    rows: [
      { label: 'Commission rate', free: '15%', pro: '10%', icon: Percent },
      { label: 'Max file size', free: '200 MB', pro: '500 MB', icon: FileText },
      { label: 'Product images', free: '5', pro: '15', icon: Image },
      { label: 'Product listings', free: '25', pro: 'Unlimited', icon: Package },
    ],
  },
  {
    section: 'Store Customisation',
    rows: [
      { label: 'Store themes', free: 'Default', pro: 'All themes', icon: Palette },
      { label: 'Custom nav links', free: '2', pro: '10', icon: Link2 },
      { label: 'Custom store pages', free: '1', pro: '5', icon: FileText },
      { label: 'Announcement bar', free: false, pro: true, icon: Megaphone },
      { label: 'Scheduled banner', free: false, pro: true, icon: Clock },
    ],
  },
  {
    section: 'Growth Tools',
    rows: [
      { label: 'Analytics', free: '30 days', pro: '90 days + export', icon: BarChart3 },
      { label: 'Discount codes', free: '1 active', pro: 'Unlimited', icon: Tag },
      { label: 'Monthly ad credit', free: '—', pro: '£5', icon: Megaphone },
      { label: 'Download limits', free: false, pro: true, icon: Shield },
      { label: 'Priority product review', free: false, pro: true, icon: Zap },
      { label: 'Advanced analytics', free: false, pro: true, icon: Star },
    ],
  },
  {
    section: 'Brand & Domain',
    rows: [
      { label: 'Free subdomain', free: true, pro: true, icon: Link2 },
      { label: 'Custom domain', free: false, pro: true, icon: ExternalLink },
      { label: 'PRO badge on store', free: false, pro: true, icon: Shield },
    ],
  },
];

const faqItems = [
  { q: 'Can I cancel anytime?', a: 'Yes. Cancel from Manage Subscription at any point — you keep Pro benefits until the end of your billing period.' },
  { q: 'What happens to my products if I downgrade?', a: 'All products stay listed. If you exceed the Free tier limits (e.g. 25 products), you won\'t be able to add new ones until you\'re within limits, but nothing is deleted.' },
  { q: 'Do I keep the PRO badge after cancelling?', a: 'The badge is removed at the end of your billing period when your subscription expires.' },
  { q: 'How does the ad credit work?', a: '£5 is added to your advertising balance each month. It can be used on any Eclipse ad placement and doesn\'t roll over.' },
];

function CellValue({ value, isPro }: { value: string | boolean; isPro?: boolean }) {
  if (typeof value === 'boolean') {
    return value ? (
      <Check className="h-4 w-4 text-green-500 mx-auto" />
    ) : (
      <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />
    );
  }
  return (
    <span className={cn(isPro ? 'font-medium text-foreground' : 'text-muted-foreground')}>
      {value}
    </span>
  );
}

export default function SellerProPage() {
  const [searchParams] = useSearchParams();
  const [billingPeriod, setBillingPeriod] = useState<SellerBillingPeriod>('monthly');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const { isPro, subscriptionEnd, isLoading, subscribe, openPortal, prices } = useSellerSubscription();

  const isSuccess = searchParams.get('subscription') === 'success';

  const handleSubscribe = async () => {
    setIsSubscribing(true);
    try {
      await subscribe(billingPeriod);
    } catch (err) {
      toast.error(errMsg(err) || 'Failed to start subscription');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleManage = async () => {
    try {
      await openPortal();
    } catch {
      toast.error('Failed to open subscription management');
    }
  };

  const ctaPrice = billingPeriod === 'monthly' ? prices.monthly : prices.annual;
  const ctaLabel = billingPeriod === 'monthly' ? '/mo' : '/yr';

  const CtaButton = ({ className }: { className?: string }) => (
    <Button
      size="lg"
      className={cn('min-w-[220px]', className)}
      onClick={handleSubscribe}
      disabled={isSubscribing || isLoading}
    >
      {isSubscribing ? (
        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
      ) : (
        <>
          <Crown className="h-4 w-4 mr-2" />
          Subscribe — £{ctaPrice}{ctaLabel}
        </>
      )}
    </Button>
  );

  return (
    <SellerLayout>
      <div className="max-w-4xl mx-auto">
        {/* Success banner */}
        {isSuccess && (
          <div className="mb-6 rounded-lg bg-green-500/10 border border-green-500/20 p-4 flex items-center gap-3">
            <Check className="h-5 w-5 text-green-500 shrink-0" />
            <div>
              <p className="font-semibold text-green-500">Welcome to Eclipse Pro!</p>
              <p className="text-sm text-muted-foreground">Your subscription is now active.</p>
            </div>
          </div>
        )}

        {/* Active subscription status */}
        {isPro && subscriptionEnd && (
          <div className="mb-8 border border-primary/20 rounded-xl bg-primary/5 p-4 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Crown className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Eclipse Pro Active</h3>
                  <Badge className="bg-primary text-primary-foreground">PRO</Badge>
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Renews {format(new Date(subscriptionEnd), 'dd MMM yyyy')}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleManage}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Manage Subscription
            </Button>
          </div>
        )}

        {/* Hero */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-3 py-1 mb-3">
            <Crown className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary">Eclipse Pro</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Grow faster with Eclipse Pro</h1>
          <p className="text-muted-foreground max-w-lg">
            Save 5% on every sale. Higher limits, professional tools, and priority support to scale your business.
          </p>

          {/* Billing toggle + CTA */}
          {!isPro && (
            <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="bg-muted rounded-lg p-1 flex items-center gap-1 w-fit">
                <button
                  className={cn(
                    'px-4 py-2 rounded-md text-sm font-medium transition-all',
                    billingPeriod === 'monthly' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => setBillingPeriod('monthly')}
                >
                  Monthly
                </button>
                <button
                  className={cn(
                    'px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2',
                    billingPeriod === 'annual' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => setBillingPeriod('annual')}
                >
                  Annual
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Save {prices.annualSavingsPercent}%</Badge>
                </button>
              </div>
              <CtaButton />
            </div>
          )}
        </div>

        {/* Highlight cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
          {highlights.map(h => (
            <div key={h.title} className="border border-border rounded-xl p-4">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <h.icon className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-sm font-semibold mb-1">{h.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{h.description}</p>
            </div>
          ))}
        </div>

        {/* Grouped comparison table — desktop */}
        <div className="hidden sm:block mb-10">
          {/* Column headers */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div />
            <div className="text-center">
              <p className="text-sm font-semibold">Free</p>
              <p className="text-xs text-muted-foreground">Current plan</p>
            </div>
            <div className="text-center bg-primary/5 border border-primary/20 rounded-xl py-2 px-3">
              <div className="flex items-center justify-center gap-1.5">
                <Crown className="h-3.5 w-3.5 text-primary" />
                <p className="text-sm font-semibold">Eclipse Pro</p>
              </div>
              <p className="text-xs font-semibold text-primary">
                {formatGBP(billingPeriod === 'monthly' ? prices.monthly : (prices.annual / 12))}/mo
              </p>
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 mt-1">RECOMMENDED</Badge>
            </div>
          </div>

          {featureGroups.map(group => (
            <div key={group.section} className="mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground py-2 border-b border-border">
                {group.section}
              </p>
              {group.rows.map(row => (
                <div key={row.label} className="grid grid-cols-3 gap-4 py-2.5 border-b border-border/50 items-center">
                  <div className="flex items-center gap-2 text-sm">
                    <row.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{row.label}</span>
                  </div>
                  <div className="text-center text-sm">
                    <CellValue value={row.free} />
                  </div>
                  <div className="text-center text-sm">
                    <CellValue value={row.pro} isPro />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Grouped comparison — mobile (stacked Pro checklist) */}
        <div className="sm:hidden mb-10">
          <div className="border border-primary/20 rounded-xl bg-primary/5 p-4 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <Crown className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Eclipse Pro includes</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Everything in Free, plus:
            </p>
            <ul className="space-y-2">
              {featureGroups.flatMap(g => g.rows).filter(r => r.pro !== false && r.pro !== r.free).map(row => (
                <li key={row.label} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>
                    <span className="font-medium">{row.label}</span>
                    {typeof row.pro === 'string' && (
                      <span className="text-muted-foreground"> — {row.pro}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <Accordion type="single" collapsible>
            <AccordionItem value="compare">
              <AccordionTrigger className="text-sm py-2">
                Compare with Free plan
              </AccordionTrigger>
              <AccordionContent>
                {featureGroups.map(group => (
                  <div key={group.section} className="mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      {group.section}
                    </p>
                    {group.rows.map(row => (
                      <div key={row.label} className="flex justify-between py-1.5 text-sm border-b border-border/30">
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className="font-medium">
                          {typeof row.free === 'boolean' ? (row.free ? '✓' : '✗') : row.free}
                          {' → '}
                          {typeof row.pro === 'boolean' ? (row.pro ? '✓' : '✗') : row.pro}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* FAQ */}
        <div className="mb-10">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Frequently Asked Questions
          </h2>
          <Accordion type="single" collapsible className="border border-border rounded-xl overflow-hidden">
            {faqItems.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className={i === faqItems.length - 1 ? 'border-b-0' : ''}>
                <AccordionTrigger className="text-sm px-4 py-3 hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="px-4 text-sm text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Bottom CTA */}
        {!isPro && (
          <div className="text-center pb-4">
            <CtaButton />
            {billingPeriod === 'annual' && (
              <p className="text-xs text-muted-foreground mt-2">
                Billed annually at £{prices.annual}. Save {prices.annualSavingsPercent}% vs monthly.
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">Cancel anytime. No long-term commitment.</p>
          </div>
        )}
      </div>
    </SellerLayout>
  );
}

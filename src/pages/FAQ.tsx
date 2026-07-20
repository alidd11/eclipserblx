import { MainLayout } from '@/components/layout/MainLayout';

import { Input } from '@/components/ui/input';
import { SITE_NAME } from '@/lib/constants';
import { 
  Search, 
  ShoppingBag, 
  Download, 
  CreditCard, 
  RefreshCw,
  Shield,
  Bot,
  ChevronDown,
  Users,
  MessageCircle,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { FAQSchema } from '@/components/seo/StructuredData';
import { usePageTracking } from '@/hooks/usePageTracking';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useDiscordUrl } from '@/hooks/useDiscordUrl';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  id: string;
  icon: React.ElementType;
  titleKey: string;
  color: string;
  items: FAQItem[];
}

const faqCategories: (FAQCategory & { id: string })[] = [
  {
    id: 'orders',
    icon: ShoppingBag,
    titleKey: 'faq.ordersAndPurchases',
    color: 'text-secondary',
    items: [
      {
        question: 'How do I view my order history?',
        answer: 'Go to your Account page and click on "Orders" to see all your past purchases, including order status, dates, and download links.',
      },
      {
        question: 'Can I cancel an order after purchase?',
        answer: 'Since digital products are delivered instantly, orders cannot be cancelled after purchase. However, you may be eligible for a refund if there\'s an issue with the product.',
      },
      {
        question: 'How long do I have access to my purchases?',
        answer: 'Once purchased, you have lifetime access to download your products. However, there is a 48-hour cooldown between downloads to ensure fair usage.',
      },
    ],
  },
  {
    id: 'downloads',
    icon: Download,
    titleKey: 'faq.downloads',
    color: 'text-success',
    items: [
      {
        question: 'How do I download my purchased products?',
        answer: 'Go to Account → Downloads to access all your purchased files. Each product can be downloaded directly from there.',
      },
      {
        question: 'Is there a download cooldown?',
        answer: 'Yes, there\'s a 48-hour cooldown between product downloads to ensure fair usage and prevent abuse.',
      },
      {
        question: 'What if my download fails or is corrupted?',
        answer: 'If your download fails, wait for the cooldown period to end and try again. If the issue persists, contact our support team for assistance.',
      },
      {
        question: 'Can I download products on multiple devices?',
        answer: 'Yes, you can download your purchased products on any device as long as you\'re logged into your account.',
      },
    ],
  },
  {
    id: 'payments',
    icon: CreditCard,
    titleKey: 'faq.paymentsBilling',
    color: 'text-accent',
    items: [
      {
        question: 'What payment methods are accepted?',
        answer: 'We accept Visa, Mastercard, American Express via Stripe, and PayPal. All transactions are secure and encrypted.',
      },
      {
        question: 'Is my payment information secure?',
        answer: 'Absolutely. We use Stripe and PayPal for payment processing, which are industry-leading secure payment providers. We never store your full card details.',
      },
      {
        question: 'Can I use discount codes?',
        answer: 'Yes! Enter your discount code at checkout before completing your purchase. Discount codes cannot be applied after an order is placed.',
      },
      {
        question: 'Will I receive a receipt?',
        answer: 'Yes, a receipt will be sent to your email address after every successful purchase. You can also view receipts in your order history.',
      },
    ],
  },
  {
    id: 'refunds',
    icon: RefreshCw,
    titleKey: 'faq.refundsReturns',
    color: 'text-warning',
    items: [
      {
        question: 'Can I get a refund?',
        answer: 'Refunds are handled case-by-case for digital products. Contact support within 14 days if there\'s an issue with your purchase.',
      },
      {
        question: 'How long does a refund take?',
        answer: 'Once approved, refunds typically take 5-10 business days to appear on your statement, depending on your payment provider.',
      },
      {
        question: 'What if the product doesn\'t work as described?',
        answer: 'If a product doesn\'t function as described, contact our support team with details about the issue. We\'ll work to resolve it or process a refund.',
      },
    ],
  },
  {
    id: 'bots',
    icon: Bot,
    titleKey: 'faq.discordBots',
    color: 'text-primary',
    items: [
      {
        question: 'How do I set up a Discord bot?',
        answer: 'After purchase, you\'ll receive an installation code in your account. Follow the setup guide provided with the bot to add it to your server.',
      },
      {
        question: 'Where do I find my installation code?',
        answer: 'Installation codes are available in your Account under the "Bot Licenses" section. Each license is tied to a specific server.',
      },
      {
        question: 'Can I transfer my bot license to another server?',
        answer: 'Bot licenses are typically tied to a specific server. Contact support if you need to transfer a license due to server migration.',
      },
      {
        question: 'What if my bot goes offline?',
        answer: 'Bot uptime is managed by our infrastructure team. If your bot is offline for an extended period, check our Discord for announcements or contact support.',
      },
    ],
  },
  {
    id: 'security',
    icon: Shield,
    titleKey: 'faq.accountSecurity',
    color: 'text-destructive',
    items: [
      {
        question: 'How do I reset my password?',
        answer: 'Click "Forgot Password" on the login page and enter your email. You\'ll receive a link to reset your password.',
      },
      {
        question: 'How do I update my account information?',
        answer: 'Go to Account → Settings to update your profile information, email preferences, and security settings.',
      },
      {
        question: 'How do I delete my account?',
        answer: 'To delete your account, please contact our support team. Note that this action is irreversible and you\'ll lose access to all purchases.',
      },
      {
        question: 'Is two-factor authentication available?',
        answer: 'We\'re working on implementing 2FA. In the meantime, use a strong, unique password to keep your account secure.',
      },
    ],
  },
  {
    id: 'selling',
    icon: ShoppingBag,
    titleKey: 'faq.sellingOnEclipse',
    color: 'text-primary',
    items: [
      {
        question: 'How do I become a seller?',
        answer: 'Visit your Account page and look for the "Become a Seller" option. You\'ll need to apply with your Discord server details and agree to our Seller Terms of Service.',
      },
      {
        question: 'What are the commission rates?',
        answer: 'Eclipse offers competitive rates with only 10-15% net commission, meaning you keep 85-90% of each sale. This is one of the lowest rates in the marketplace.',
      },
      {
        question: 'Do I retain ownership of my products?',
        answer: 'Yes! You retain 100% intellectual property ownership of all products you create and sell on Eclipse. We never claim rights to your work.',
      },
      {
        question: 'How do I get paid?',
        answer: 'Seller payouts are processed regularly. You can set up your preferred payout method in your seller dashboard under payment settings.',
      },
      {
        question: 'What products can I sell?',
        answer: 'You can sell digital products like Discord bots, scripts, graphics, templates, and more. All products must comply with our terms of service and community guidelines.',
      },
    ],
  },
];

function FAQAccordionItem({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full py-4 text-left hover:text-primary transition-colors"
      >
        <span className="font-medium pr-4">{item.question}</span>
        <ChevronDown className={cn(
          "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </button>
      <div className={cn(
        "overflow-hidden transition-all duration-200",
        isOpen ? "max-h-96 pb-4" : "max-h-0"
      )}>
        <p className="text-muted-foreground">{item.answer}</p>
      </div>
    </div>
  );
}

function FAQCategorySection({ category, searchQuery }: { category: FAQCategory; searchQuery: string }) {
  const { t } = useTranslation();
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  const filteredItems = category.items.filter(
    (item) =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (filteredItems.length === 0) return null;

  const toggleItem = (index: number) => {
    setOpenItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const Icon = category.icon;

  return (
    <section id={category.id} className="scroll-mt-24 bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 p-5 border-b border-border bg-muted/30">
        <div className={cn("p-2.5 rounded-lg bg-background", category.color)}>
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-semibold">{t(category.titleKey)}</h2>
        <span className="ml-auto text-xs font-mono text-muted-foreground">
          {filteredItems.length.toString().padStart(2, '0')}
        </span>
      </div>
      <div className="px-5">
        {filteredItems.map((item, index) => (
          <FAQAccordionItem
            key={index}
            item={item}
            isOpen={openItems.has(index)}
            onToggle={() => toggleItem(index)}
          />
        ))}
      </div>
    </section>
  );
}

function CategoryQuickNav({ searchQuery }: { searchQuery: string }) {
  const { t } = useTranslation();
  const visible = faqCategories.filter((c) =>
    c.items.some(
      (i) =>
        i.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );
  if (visible.length === 0) return null;
  return (
    <nav className="hidden lg:block sticky top-24 space-y-1" aria-label="FAQ categories">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
        Categories
      </p>
      {visible.map((c) => {
        const Icon = c.icon;
        return (
          <a
            key={c.id}
            href={`#${c.id}`}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Icon className="h-4 w-4" />
            {t(c.titleKey)}
          </a>
        );
      })}
    </nav>
  );
}

export default function FAQ() {
  usePageTracking({ pagePath: '/faq' });
  usePageMeta({
    title: 'FAQ',
    description: 'Find answers to frequently asked questions about Eclipse marketplace — buying, selling, payments, and support.',
    canonicalPath: '/faq',
  });
  const { t } = useTranslation();
  const { discordUrl } = useDiscordUrl();
  const [searchQuery, setSearchQuery] = useState('');

  const totalQuestions = faqCategories.reduce((sum, cat) => sum + cat.items.length, 0);
  
  const filteredCount = faqCategories.reduce((sum, cat) => {
    return sum + cat.items.filter(
      (item) =>
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    ).length;
  }, 0);

  return (
    <MainLayout>
      <FAQSchema faqs={faqCategories.flatMap((c) => c.items)} />
      <div className="container mx-auto px-4 py-10 md:py-16 max-w-6xl">
        {/* Editorial hero */}
        <div className="grid md:grid-cols-[1.15fr_1fr] gap-10 items-end mb-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-4">
              Frequently asked
            </p>
            <h1 className="font-display font-bold text-4xl md:text-5xl leading-[1.05] tracking-tight text-foreground">
              {t('faq.title')}
            </h1>
            <p className="mt-5 text-muted-foreground text-base md:text-lg max-w-lg leading-relaxed">
              {t('faq.subtitle', { siteName: SITE_NAME })}
            </p>
          </div>
          <div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder={t('faq.searchQuestions')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-12 text-base bg-card border-border"
              />
            </div>
            {searchQuery && (
              <p className="mt-3 text-xs text-muted-foreground">
                {t('faq.showingResults', { filtered: filteredCount, total: totalQuestions })}
              </p>
            )}
          </div>
        </div>

        {/* Sidebar nav + accordions */}
        <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-10">
          <CategoryQuickNav searchQuery={searchQuery} />

          <div className="space-y-5 mb-16">
            {faqCategories.map((category, index) => (
              <FAQCategorySection
                key={index}
                category={category}
                searchQuery={searchQuery}
              />
            ))}

            {searchQuery && filteredCount === 0 && (
              <div className="text-center py-12 border border-dashed border-border rounded-xl">
                <p className="text-base text-foreground">{t('faq.noResults', { query: searchQuery })}</p>
                <p className="text-sm text-muted-foreground mt-2">{t('faq.noResultsHint')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Closing: primary CTA + secondary channels */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="grid md:grid-cols-[1.3fr_1fr]">
            <div className="p-7 md:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">
                Didn't find it?
              </p>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground leading-tight tracking-tight">
                {t('faq.stillHaveQuestions')}
              </h2>
              <p className="mt-3 text-muted-foreground max-w-md leading-relaxed">
                {t('faq.supportReady')}
              </p>
              <button
                onClick={() => {
                  const btn = document.querySelector('[data-chat-widget]');
                  if (btn instanceof HTMLElement) btn.click();
                }}
                className="inline-flex items-center gap-2 h-11 px-5 mt-5 rounded-lg bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <MessageCircle className="h-4 w-4" />
                {t('faq.liveChat')}
                <span className="text-xs opacity-70 font-normal ml-1">
                  · {t('faq.liveChatHours')}
                </span>
              </button>
            </div>

            <div className="border-t md:border-t-0 md:border-l border-border bg-muted/30 p-6 md:p-8 grid content-center gap-1">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Other channels
              </p>
              <a
                href={discordUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between py-2.5 border-b border-border/60 last:border-0"
              >
                <span className="flex items-center gap-3 text-sm text-foreground">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  {t('faq.discord')}
                </span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </a>
              <Link
                to="/support"
                className="group flex items-center justify-between py-2.5 border-b border-border/60 last:border-0"
              >
                <span className="flex items-center gap-3 text-sm text-foreground">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  {t('faq.supportCentre')}
                </span>
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  {t('faq.browseHelp')}
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

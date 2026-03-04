import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SITE_NAME } from '@/lib/constants';
import { usePageTracking } from '@/hooks/usePageTracking';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useDiscordUrl } from '@/hooks/useDiscordUrl';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Search,
  ShoppingCart,
  Download,
  CreditCard,
  Shield,
  Bot,
  ChevronDown,
  Store,
  DollarSign,
  Sparkles,
  Users,
  MessageCircle,
  ChevronRight,
  ExternalLink,
  HelpCircle,
  RefreshCw,
  Link2,
  FileText,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────

interface Article {
  question: string;
  answer: string;
}

interface HelpCategory {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  articles: Article[];
}

// ── Data ───────────────────────────────────────────────

const helpCategories: HelpCategory[] = [
  {
    id: 'getting-started',
    icon: Sparkles,
    title: 'Getting Started',
    description: 'New to Eclipse? Start here.',
    color: 'text-yellow-500',
    articles: [
      {
        question: 'What is Eclipse?',
        answer: `${SITE_NAME} is a marketplace for premium Roblox assets, scripts, Discord bots, and digital tools. Browse products from verified sellers, purchase securely, and download instantly.`,
      },
      {
        question: 'How do I create an account?',
        answer: 'Click "Sign Up" in the top navigation. You can register with your email address. After verifying your email you\'ll have full access to browse, purchase, and download products.',
      },
      {
        question: 'How do I link my Discord account?',
        answer: 'Go to Account → Settings and click "Link Discord". This unlocks community features, bot licenses, and Discord-exclusive perks like Eclipse+ booster trials.',
      },
      {
        question: 'How do I link my Roblox account?',
        answer: 'Navigate to Account → Settings and click "Link Roblox". Linking your Roblox account enables verified ownership badges and Robux payment options.',
      },
    ],
  },
  {
    id: 'buying',
    icon: ShoppingCart,
    title: 'Buying Products',
    description: 'Purchasing, orders, and checkout.',
    color: 'text-blue-500',
    articles: [
      {
        question: 'How do I purchase a product?',
        answer: 'Find a product you like, add it to your cart, and proceed to checkout. We accept Visa, Mastercard, American Express (via Stripe), PayPal, and Eclipse Credits.',
      },
      {
        question: 'How do I view my order history?',
        answer: 'Go to Account → Orders to see all your past purchases including order status, dates, and download links.',
      },
      {
        question: 'Can I cancel an order after purchase?',
        answer: 'Since digital products are delivered instantly, orders cannot be cancelled after purchase. However, you may be eligible for a refund — see our Refunds section.',
      },
      {
        question: 'Can I use discount codes?',
        answer: 'Yes! Enter your discount code at checkout before completing your purchase. Codes cannot be applied retroactively.',
      },
    ],
  },
  {
    id: 'downloads',
    icon: Download,
    title: 'Downloads',
    description: 'Accessing and downloading your files.',
    color: 'text-green-500',
    articles: [
      {
        question: 'How do I download purchased products?',
        answer: 'Go to Account → Downloads to access all your purchased files. Each product can be downloaded directly from there.',
      },
      {
        question: 'Is there a download cooldown?',
        answer: 'Yes — there\'s a 48-hour cooldown between downloads of the same product to ensure fair usage and prevent abuse.',
      },
      {
        question: 'What if my download fails?',
        answer: 'If your download fails, wait for the cooldown period to end and try again. If the issue persists, open a support ticket and our team will help.',
      },
      {
        question: 'Can I download on multiple devices?',
        answer: 'Yes. You can download your purchased products on any device as long as you\'re logged into your account.',
      },
      {
        question: 'How long do I have access to my purchases?',
        answer: 'Once purchased, you have lifetime access to download your products (subject to the 48-hour cooldown between downloads).',
      },
    ],
  },
  {
    id: 'payments',
    icon: CreditCard,
    title: 'Payments & Billing',
    description: 'Payment methods, receipts, and credits.',
    color: 'text-purple-500',
    articles: [
      {
        question: 'What payment methods are accepted?',
        answer: 'We accept Visa, Mastercard, American Express via Stripe, PayPal, and Eclipse Credits. All transactions are secure and encrypted.',
      },
      {
        question: 'What are Eclipse Credits?',
        answer: 'Eclipse Credits are a store currency you can top up and use for purchases. They\'re great for budgeting and can sometimes include bonus amounts on larger top-ups.',
      },
      {
        question: 'Is my payment information secure?',
        answer: 'Absolutely. We use Stripe and PayPal — both are PCI-DSS compliant, industry-leading payment providers. We never store your full card details.',
      },
      {
        question: 'Will I receive a receipt?',
        answer: 'Yes — a receipt is emailed after every successful purchase. You can also view receipts in your order history.',
      },
    ],
  },
  {
    id: 'refunds',
    icon: RefreshCw,
    title: 'Refunds & Returns',
    description: 'Refund eligibility and process.',
    color: 'text-orange-500',
    articles: [
      {
        question: 'Can I get a refund?',
        answer: 'Refunds are handled case-by-case for digital products. Contact support within 14 days if there\'s an issue with your purchase.',
      },
      {
        question: 'How long does a refund take?',
        answer: 'Once approved, refunds typically take 5–10 business days to appear on your statement, depending on your payment provider.',
      },
      {
        question: 'What if the product doesn\'t work as described?',
        answer: 'Contact our support team with details about the issue. We\'ll work to resolve it with the seller or process a refund.',
      },
    ],
  },
  {
    id: 'discord-bots',
    icon: Bot,
    title: 'Discord Bots',
    description: 'Bot setup, licenses, and troubleshooting.',
    color: 'text-indigo-500',
    articles: [
      {
        question: 'How do I set up a Discord bot?',
        answer: 'After purchase, you\'ll receive an installation code in your account. Go to Account → Bot Licenses, enter the code, and follow the guided setup to add the bot to your server.',
      },
      {
        question: 'Where do I find my installation code?',
        answer: 'Installation codes are available in Account → Bot Licenses. Each code is tied to a specific server once activated.',
      },
      {
        question: 'Can I transfer a bot license to another server?',
        answer: 'Bot licenses are typically tied to a specific server. Contact support if you need to transfer a license due to server migration.',
      },
      {
        question: 'What if my bot goes offline?',
        answer: 'Bot uptime is managed by our infrastructure. If your bot is offline for an extended period, check our Discord for announcements or open a support ticket.',
      },
      {
        question: 'How do I manage my bot settings?',
        answer: 'Visit the Bot Dashboard from your account to configure features, set prefixes, enable/disable modules, and monitor your bot\'s status.',
      },
    ],
  },
  {
    id: 'selling',
    icon: Store,
    title: 'Selling on Eclipse',
    description: 'Become a seller and grow your store.',
    color: 'text-primary',
    articles: [
      {
        question: 'How do I become a seller?',
        answer: 'Visit the "Sell on Eclipse" page or go to Account → Become a Seller. You\'ll need to apply with your Discord server details and agree to our Seller Terms of Service.',
      },
      {
        question: 'What are the commission rates?',
        answer: 'Eclipse offers competitive rates with only 10–15% net commission, meaning you keep 85–90% of each sale. This is one of the lowest rates in the marketplace.',
      },
      {
        question: 'Do I retain ownership of my products?',
        answer: 'Yes — you retain 100% intellectual property ownership of all products you create and sell on Eclipse. We never claim rights to your work.',
      },
      {
        question: 'What products can I sell?',
        answer: 'You can sell digital products like Roblox scripts, models, plugins, Discord bots, graphics, templates, and more. All products must comply with our Terms of Service.',
      },
      {
        question: 'How do I get paid?',
        answer: 'Seller payouts are processed regularly. Set up your preferred payout method (Stripe or PayPal) in your seller dashboard under payment settings.',
      },
      {
        question: 'How does the review process work?',
        answer: 'All new product listings go through a moderation review before being published. Bot products require additional manual verification from our staff to prevent scams.',
      },
    ],
  },
  {
    id: 'eclipse-plus',
    icon: Sparkles,
    title: 'Eclipse+ Membership',
    description: 'Premium perks and subscription info.',
    color: 'text-amber-500',
    articles: [
      {
        question: 'What is Eclipse+?',
        answer: 'Eclipse+ is our premium membership that gives you exclusive perks including early access to new products, member-only discounts, priority support, and a special badge on your profile.',
      },
      {
        question: 'How do I subscribe to Eclipse+?',
        answer: 'Visit the Eclipse+ page from the navigation menu. Choose your preferred billing period (monthly or annual) and complete payment to activate your membership instantly.',
      },
      {
        question: 'Can I cancel my Eclipse+ subscription?',
        answer: 'Yes — you can cancel anytime from your Account settings. You\'ll retain benefits until the end of your current billing period.',
      },
      {
        question: 'Do Discord boosters get Eclipse+?',
        answer: 'Discord server boosters receive a complimentary Eclipse+ trial. Boost our server and link your Discord account to claim the perk automatically.',
      },
    ],
  },
  {
    id: 'account-security',
    icon: Shield,
    title: 'Account & Security',
    description: 'Profile, passwords, and safety.',
    color: 'text-red-500',
    articles: [
      {
        question: 'How do I reset my password?',
        answer: 'Click "Forgot Password" on the login page and enter your email. You\'ll receive a link to set a new password.',
      },
      {
        question: 'How do I update my account information?',
        answer: 'Go to Account → Settings to update your profile, display name, avatar, email preferences, and linked accounts.',
      },
      {
        question: 'How do I delete my account?',
        answer: 'Contact our support team to request account deletion. Note that this is irreversible and you\'ll lose access to all purchases.',
      },
    ],
  },
  {
    id: 'ip-protection',
    icon: FileText,
    title: 'IP Protection & DMCA',
    description: 'Protect your work and report theft.',
    color: 'text-teal-500',
    articles: [
      {
        question: 'How does Eclipse protect my intellectual property?',
        answer: 'Eclipse offers IP Shield — a free tool for creators to register their work. If someone copies your assets, our staff can investigate and take action.',
      },
      {
        question: 'How do I file a DMCA takedown?',
        answer: 'Visit our DMCA page for the full process. You can also use the IP Shield dashboard to submit takedown requests directly to our team.',
      },
      {
        question: 'What happens to sellers who violate IP rights?',
        answer: 'Sellers found violating IP rights face product removal, store suspension, and potential permanent bans. We take IP protection seriously.',
      },
    ],
  },
  {
    id: 'affiliate',
    icon: Link2,
    title: 'Affiliate Programme',
    description: 'Earn by referring new users.',
    color: 'text-pink-500',
    articles: [
      {
        question: 'How does the affiliate programme work?',
        answer: 'Apply to become an affiliate, get your unique referral link, and earn commission on every qualifying purchase made by users you refer.',
      },
      {
        question: 'How do I apply?',
        answer: 'Visit the Affiliate page and submit an application. We review applications within a few business days.',
      },
      {
        question: 'How do I get paid as an affiliate?',
        answer: 'Affiliate commissions accumulate in your balance. Once you reach the minimum threshold, request a payout via your preferred method.',
      },
    ],
  },
];

// ── Components ─────────────────────────────────────────

function AccordionItem({ article, isOpen, onToggle }: { article: Article; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full py-4 text-left hover:text-primary transition-colors"
      >
        <span className="font-medium pr-4">{article.question}</span>
        <ChevronDown className={cn(
          "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </button>
      <div className={cn(
        "overflow-hidden transition-all duration-200",
        isOpen ? "max-h-[32rem] pb-4" : "max-h-0"
      )}>
        <p className="text-muted-foreground leading-relaxed">{article.answer}</p>
      </div>
    </div>
  );
}

function CategorySection({ category, searchQuery }: { category: HelpCategory; searchQuery: string }) {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  const filtered = category.articles.filter(
    (a) =>
      a.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (filtered.length === 0) return null;

  const toggleItem = (i: number) => {
    setOpenItems((prev) => {
      const s = new Set(prev);
      s.has(i) ? s.delete(i) : s.add(i);
      return s;
    });
  };

  const Icon = category.icon;

  return (
    <section id={category.id} className="scroll-mt-24">
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 p-5 border-b border-border bg-muted/30">
          <div className={cn("p-2.5 rounded-lg bg-background", category.color)}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{category.title}</h2>
            <p className="text-sm text-muted-foreground">{category.description}</p>
          </div>
        </div>
        <div className="px-5">
          {filtered.map((article, i) => (
            <AccordionItem key={i} article={article} isOpen={openItems.has(i)} onToggle={() => toggleItem(i)} />
          ))}
        </div>
      </div>
    </section>
  );
}

function QuickNav({ categories, searchQuery }: { categories: HelpCategory[]; searchQuery: string }) {
  const visible = categories.filter((c) =>
    c.articles.some(
      (a) =>
        a.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  if (visible.length === 0) return null;

  return (
    <nav className="hidden lg:block sticky top-24 space-y-1" aria-label="Help Center navigation">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Categories</p>
      {visible.map((c) => {
        const Icon = c.icon;
        return (
          <a
            key={c.id}
            href={`#${c.id}`}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <Icon className="h-4 w-4" />
            {c.title}
          </a>
        );
      })}
    </nav>
  );
}

// ── Page ────────────────────────────────────────────────

export default function HelpCenter() {
  usePageTracking({ pagePath: '/help-center' });
  usePageMeta({
    title: 'Help Center',
    description: `Find answers about buying, selling, downloads, payments, Discord bots, Eclipse+ membership, and more on ${SITE_NAME}.`,
    canonicalPath: '/help-center',
  });

  const { discordUrl } = useDiscordUrl();
  const [searchQuery, setSearchQuery] = useState('');

  const totalArticles = helpCategories.reduce((s, c) => s + c.articles.length, 0);
  const filteredCount = helpCategories.reduce(
    (s, c) =>
      s +
      c.articles.filter(
        (a) =>
          a.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.answer.toLowerCase().includes(searchQuery.toLowerCase())
      ).length,
    0
  );

  // FAQ structured data for SEO
  const faqStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: helpCategories.flatMap((c) =>
      c.articles.map((a) => ({
        '@type': 'Question',
        name: a.question,
        acceptedAnswer: { '@type': 'Answer', text: a.answer },
      }))
    ),
  };

  return (
    <MainLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Hero */}
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <HelpCircle className="h-4 w-4" />
            Help Center
          </div>
          <h1 className="text-4xl font-display font-bold mb-4">How can we help?</h1>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            Browse {totalArticles} articles across {helpCategories.length} topics — or search for what you need.
          </p>

          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search articles…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-base bg-muted/50 border-border"
            />
          </div>

          {searchQuery && (
            <p className="mt-4 text-sm text-muted-foreground">
              Showing {filteredCount} of {totalArticles} articles
            </p>
          )}
        </header>

        {/* Layout: sidebar nav + articles */}
        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-8">
          <QuickNav categories={helpCategories} searchQuery={searchQuery} />

          <div className="space-y-6 mb-12">
            {helpCategories.map((cat) => (
              <CategorySection key={cat.id} category={cat} searchQuery={searchQuery} />
            ))}

            {searchQuery && filteredCount === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg">No articles match "{searchQuery}"</p>
                <p className="text-sm mt-2">Try a different search or browse the categories above.</p>
              </div>
            )}
          </div>
        </div>

        {/* Contact CTA */}
        <div className="bg-muted/30 rounded-xl p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-display font-semibold mb-2">Still need help?</h2>
            <p className="text-muted-foreground">Our support team is ready to assist you.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => {
                const btn = document.querySelector('[data-chat-widget]');
                if (btn instanceof HTMLElement) btn.click();
              }}
            >
              <MessageCircle className="h-5 w-5" />
              <span className="font-medium">Live Chat</span>
              <span className="text-xs text-muted-foreground">Available 24 / 7</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" asChild>
              <a href={discordUrl} target="_blank" rel="noopener noreferrer">
                <Users className="h-5 w-5" />
                <span className="font-medium">Discord</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  Community support <ExternalLink className="h-3 w-3" />
                </span>
              </a>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" asChild>
              <Link to="/contact">
                <ChevronRight className="h-5 w-5" />
                <span className="font-medium">Contact Us</span>
                <span className="text-xs text-muted-foreground">Send us a message</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

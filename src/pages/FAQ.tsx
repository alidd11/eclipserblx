import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
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
import { usePageTracking } from '@/hooks/usePageTracking';
import { useDiscordUrl } from '@/hooks/useDiscordUrl';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  icon: React.ElementType;
  title: string;
  color: string;
  items: FAQItem[];
}

const faqCategories: FAQCategory[] = [
  {
    icon: ShoppingBag,
    title: 'Orders & Purchases',
    color: 'text-blue-500',
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
    icon: Download,
    title: 'Downloads',
    color: 'text-green-500',
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
    icon: CreditCard,
    title: 'Payments & Billing',
    color: 'text-purple-500',
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
    icon: RefreshCw,
    title: 'Refunds & Returns',
    color: 'text-orange-500',
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
    icon: Bot,
    title: 'Discord Bots',
    color: 'text-indigo-500',
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
    icon: Shield,
    title: 'Account & Security',
    color: 'text-red-500',
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
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 p-5 border-b border-border bg-muted/30">
        <div className={cn("p-2.5 rounded-lg bg-background", category.color)}>
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-semibold">{category.title}</h2>
        <span className="ml-auto text-sm text-muted-foreground">
          {filteredItems.length} {filteredItems.length === 1 ? 'question' : 'questions'}
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
    </div>
  );
}

export default function FAQ() {
  usePageTracking({ pagePath: '/faq' });
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
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header with Search */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-display font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-muted-foreground text-lg mb-8">
            Find answers to common questions about {SITE_NAME}
          </p>
          
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-base bg-muted/50 border-border"
            />
          </div>
          
          {searchQuery && (
            <p className="mt-4 text-sm text-muted-foreground">
              Showing {filteredCount} of {totalQuestions} questions
            </p>
          )}
        </div>

        {/* FAQ Categories */}
        <div className="space-y-6 mb-12">
          {faqCategories.map((category, index) => (
            <FAQCategorySection 
              key={index} 
              category={category} 
              searchQuery={searchQuery}
            />
          ))}
          
          {searchQuery && filteredCount === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">No results found for "{searchQuery}"</p>
              <p className="text-sm mt-2">Try a different search term or contact support</p>
            </div>
          )}
        </div>

        {/* Contact Options */}
        <div className="bg-muted/30 rounded-xl p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-display font-semibold mb-2">Still have questions?</h2>
            <p className="text-muted-foreground">
              Our support team is ready to assist you
            </p>
          </div>
          
          <div className="grid sm:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => {
                const chatButton = document.querySelector('[data-chat-widget]');
                if (chatButton instanceof HTMLElement) chatButton.click();
              }}
            >
              <MessageCircle className="h-5 w-5" />
              <span className="font-medium">Live Chat</span>
              <span className="text-xs text-muted-foreground">Mon-Sat, 9AM-7PM</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              asChild
            >
              <a href={discordUrl} target="_blank" rel="noopener noreferrer">
                <Users className="h-5 w-5" />
                <span className="font-medium">Discord</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  Community support <ExternalLink className="h-3 w-3" />
                </span>
              </a>
            </Button>
            
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              asChild
            >
              <Link to="/support">
                <ChevronRight className="h-5 w-5" />
                <span className="font-medium">Support Centre</span>
                <span className="text-xs text-muted-foreground">Browse help topics</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

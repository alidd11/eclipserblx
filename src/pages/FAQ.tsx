import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
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
  Users,
  MessageCircle,
  HelpCircle,
  Store,
  Bot,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePageTracking } from '@/hooks/usePageTracking';
import { useDiscordUrl } from '@/hooks/useDiscordUrl';
import { useState } from 'react';

const helpTopics = [
  {
    icon: ShoppingBag,
    title: 'Orders',
    description: 'View order status, access purchases, and order history.',
    href: '/account',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    icon: Download,
    title: 'Downloads',
    description: 'Access your purchased files and download history.',
    href: '/account',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    icon: RefreshCw,
    title: 'Refunds & Disputes',
    description: 'Request a refund or resolve issues with purchases.',
    href: '/refund-policy',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  {
    icon: CreditCard,
    title: 'Payments',
    description: 'Payment methods, billing, and transaction queries.',
    href: '/support',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    icon: Store,
    title: 'Selling on Eclipse',
    description: 'Become a creator and start selling your products.',
    href: '/account',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    icon: Bot,
    title: 'Discord Bots',
    description: 'Bot setup, installation codes, and configuration.',
    href: '/support',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
  },
  {
    icon: Shield,
    title: 'Account & Security',
    description: 'Manage your account settings and security options.',
    href: '/account',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  {
    icon: Users,
    title: 'Community',
    description: 'Forums, Discord server, and community guidelines.',
    href: '/forum',
    color: 'text-teal-500',
    bgColor: 'bg-teal-500/10',
  },
];

const quickAnswers = [
  {
    question: 'How do I download my purchased products?',
    answer: 'Go to Account → Downloads to access all your purchased files. Each product can be downloaded directly from there.',
  },
  {
    question: 'What payment methods are accepted?',
    answer: 'We accept Visa, Mastercard, American Express via Stripe, and PayPal. All transactions are secure.',
  },
  {
    question: 'Can I get a refund?',
    answer: 'Refunds are handled case-by-case for digital products. Contact support within 14 days if there\'s an issue with your purchase.',
  },
  {
    question: 'How do I set up a Discord bot?',
    answer: 'After purchase, you\'ll receive an installation code in your account. Follow the setup guide provided with the bot.',
  },
  {
    question: 'Is there a download cooldown?',
    answer: 'Yes, there\'s a 48-hour cooldown between product downloads to ensure fair usage.',
  },
  {
    question: 'How do I become a seller?',
    answer: 'Visit the Sell page to apply as a creator. Once approved, you can list and sell your own products.',
  },
];

export default function FAQ() {
  usePageTracking({ pagePath: '/faq' });
  const { discordUrl } = useDiscordUrl();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAnswers = quickAnswers.filter(
    (item) =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Header with Search */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-display font-bold mb-4">Help Centre</h1>
          <p className="text-muted-foreground text-lg mb-8">
            Hi, how can we help you today?
          </p>
          
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-base bg-muted/50 border-border"
            />
          </div>
        </div>

        {/* Help Topics Grid */}
        <div className="mb-12">
          <h2 className="text-xl font-display font-semibold mb-6">Browse Topics</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {helpTopics.map((topic, index) => (
              <Link key={index} to={topic.href}>
                <Card className="bg-card border-border hover:border-primary/50 transition-all hover:shadow-lg group h-full">
                  <CardContent className="p-5">
                    <div className={`inline-flex p-3 rounded-lg ${topic.bgColor} mb-3`}>
                      <topic.icon className={`h-5 w-5 ${topic.color}`} />
                    </div>
                    <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                      {topic.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {topic.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Answers */}
        <div className="mb-12">
          <h2 className="text-xl font-display font-semibold mb-6">Quick Answers</h2>
          <div className="space-y-3">
            {filteredAnswers.map((item, index) => (
              <Card key={index} className="bg-card border-border">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <HelpCircle className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">{item.question}</h3>
                      <p className="text-sm text-muted-foreground">{item.answer}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {searchQuery && filteredAnswers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No results found for "{searchQuery}"</p>
                <p className="text-sm mt-1">Try a different search or contact support</p>
              </div>
            )}
          </div>
        </div>

        {/* Contact Options */}
        <div className="bg-muted/30 rounded-xl p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-display font-semibold mb-2">Still need help?</h2>
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
              <Link to="/contact">
                <ChevronRight className="h-5 w-5" />
                <span className="font-medium">Contact Us</span>
                <span className="text-xs text-muted-foreground">Email support</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { SITE_NAME } from '@/lib/constants';
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
  Headphones,
  Package,
  ChevronDown,
} from 'lucide-react';

const supportCategories = [
  {
    icon: Download,
    title: 'Downloads & Products',
    description: 'Issues with downloading products, accessing your purchases, or product-related questions.',
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
    description: 'Payment issues, order status, invoices, and billing questions.',
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
    description: 'Account settings, password resets, and security-related help.',
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
    description: 'Information about our refund policy and how to request a refund.',
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
  usePageMeta({ title: 'Support', description: 'Get help with Eclipse marketplace. Browse support articles, open a ticket or contact our team.', canonicalPath: '/support' });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [guestFormOpen, setGuestFormOpen] = useState(false);

  const quickLinks = [
    { icon: Ticket, label: 'Submit a Ticket', description: 'Get help from our team', action: 'ticket' },
    { icon: MessageCircle, label: 'Live Chat', description: 'Real-time support', action: 'chat' },
    { icon: FileQuestion, label: 'FAQ', description: 'Browse common questions', href: '/faq' },
  ];

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <Headphones className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-display font-bold mb-4">Support Centre</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Welcome to the {SITE_NAME} Support Centre. Find help articles, contact support, or browse our FAQ.
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          {quickLinks.map((link, index) => (
            <div key={index} className="border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-colors">
              <div className="p-6">
                {link.action === 'chat' ? (
                  <button
                    onClick={() => {
                      const chatButton = document.querySelector('[data-chat-widget]');
                      if (chatButton instanceof HTMLElement) chatButton.click();
                    }}
                    className="w-full text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <link.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{link.label}</h3>
                        <p className="text-sm text-muted-foreground">{link.description}</p>
                      </div>
                    </div>
                  </button>
                ) : link.action === 'ticket' ? (
                  <button
                    onClick={() => {
                      if (user) {
                        setCreateDialogOpen(true);
                      } else {
                        navigate('/auth');
                      }
                    }}
                    className="w-full text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <link.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{link.label}</h3>
                        <p className="text-sm text-muted-foreground">{link.description}</p>
                      </div>
                    </div>
                  </button>
                ) : (
                  <Link to={link.href!} className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <link.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{link.label}</h3>
                      <p className="text-sm text-muted-foreground">{link.description}</p>
                    </div>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Support Categories */}
        <div className="mb-12">
          <h2 className="text-2xl font-display font-bold mb-6">Help Topics</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {supportCategories.map((category, index) => (
              <div key={index} className="border border-border rounded-xl overflow-hidden">
                <div className="px-6 py-4 bg-muted/30 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <category.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">{category.title}</h3>
                      <p className="text-xs text-muted-foreground">{category.description}</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <ul className="space-y-2">
                    {category.articles.map((article, articleIndex) => {
                      const isRecoverLink = article === 'Recover a missing order';
                      return (
                        <li key={articleIndex}>
                          <Link
                            to={isRecoverLink ? '/recover-order' : `/faq?search=${encodeURIComponent(article)}`}
                            className="text-sm text-muted-foreground hover:text-primary flex items-center gap-2 transition-colors"
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                            {article}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Recovery Banner */}
        <div className="mb-8 border border-border rounded-xl overflow-hidden border-l-4 border-l-primary/40">
          <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-muted/30">
            <Package className="w-6 h-6 text-primary flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold">Missing an order?</h3>
              <p className="text-sm text-muted-foreground">If you completed a payment but can't see your purchase, you can recover it instantly.</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/recover-order">Recover Order</Link>
            </Button>
          </div>
        </div>

        {/* Guest Support Form — always available */}
        <div className="mb-8 border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => setGuestFormOpen(!guestFormOpen)}
            className="w-full px-6 py-4 flex items-center justify-between bg-muted/30 hover:bg-muted/40 transition-colors text-left"
          >
            <div>
              <h3 className="font-semibold text-sm">Having trouble signing in?</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Submit a support ticket without an account</p>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${guestFormOpen ? 'rotate-180' : ''}`} />
          </button>
          {guestFormOpen && (
            <div className="p-6 border-t border-border">
              <GuestSupportForm />
            </div>
          )}
        </div>

        {/* Contact Section */}
        <div className="bg-muted/50 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-display font-bold mb-4">Need More Help?</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Can't find what you're looking for? Our support team is available to help you with any questions or issues.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contact">
              <Button>Contact Us</Button>
            </Link>
            <Link to="/faq">
              <Button variant="outline">Browse FAQ</Button>
            </Link>
            {user && (
              <Link to="/support/tickets">
                <Button variant="outline">My Tickets</Button>
              </Link>
            )}
          </div>
        </div>

        {/* Create Ticket Dialog */}
        <CreateTicketDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />
      </div>
    </MainLayout>
  );
}

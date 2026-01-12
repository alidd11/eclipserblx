import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SITE_NAME } from '@/lib/constants';
import {
  MessageCircle,
  FileQuestion,
  Download,
  CreditCard,
  ShieldCheck,
  Users,
  ExternalLink,
  Headphones,
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

const quickLinks = [
  { icon: MessageCircle, label: 'Live Chat', description: 'Chat with our support team', action: 'chat' },
  { icon: FileQuestion, label: 'FAQ', description: 'Browse common questions', href: '/faq' },
  { icon: Users, label: 'Discord', description: 'Join our community', href: 'https://discord.gg/EmQnXwv6VZ', external: true },
];

export default function Support() {
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
            <Card key={index} className="bg-card border-border hover:border-primary/50 transition-colors">
              <CardContent className="p-6">
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
                ) : link.external ? (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4"
                  >
                    <div className="p-3 rounded-lg bg-primary/10">
                      <link.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold flex items-center gap-1">
                        {link.label}
                        <ExternalLink className="w-3 h-3" />
                      </h3>
                      <p className="text-sm text-muted-foreground">{link.description}</p>
                    </div>
                  </a>
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
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Support Categories */}
        <div className="mb-12">
          <h2 className="text-2xl font-display font-bold mb-6">Help Topics</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {supportCategories.map((category, index) => (
              <Card key={index} className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <category.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{category.title}</CardTitle>
                      <CardDescription>{category.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {category.articles.map((article, articleIndex) => (
                      <li key={articleIndex} className="text-sm text-muted-foreground flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                        {article}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Contact Section */}
        <div className="bg-muted/50 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-display font-bold mb-4">Need More Help?</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Can't find what you're looking for? Our support team is available to help you with any questions or issues.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contact">
              <Button className="gradient-button border-0">Contact Us</Button>
            </Link>
            <Link to="/faq">
              <Button variant="outline">Browse FAQ</Button>
            </Link>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

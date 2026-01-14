import { MainLayout } from '@/components/layout/MainLayout';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SITE_NAME } from '@/lib/constants';
import { HelpCircle, MessageCircle, Headphones } from 'lucide-react';
import { Link } from 'react-router-dom';

const faqItems = [
  {
    category: 'Products & Downloads',
    questions: [
      {
        question: 'What types of products do you sell?',
        answer: `${SITE_NAME} offers a variety of premium digital assets including scripts, tools, templates, and other digital products for various platforms.`,
      },
      {
        question: 'How do I download my purchased products?',
        answer: 'After completing your purchase, head to your Account page and click on "Downloads". All your purchased products will be available there for download.',
      },
      {
        question: 'Is there a download limit?',
        answer: 'There is a 48-hour cooldown between downloads to prevent abuse. After downloading a product, you\'ll need to wait 48 hours before downloading another.',
      },
      {
        question: 'Can I re-download my purchases?',
        answer: 'Yes, you can re-download any product you\'ve purchased at any time from your Downloads page, subject to the 48-hour cooldown period.',
      },
    ],
  },
  {
    category: 'Payments & Pricing',
    questions: [
      {
        question: 'What payment methods do you accept?',
        answer: 'We accept all major credit/debit cards through Stripe, as well as PayPal for your convenience.',
      },
      {
        question: 'Are prices inclusive of VAT?',
        answer: 'All prices displayed on our website are inclusive of UK VAT where applicable.',
      },
      {
        question: 'Do you offer discount codes?',
        answer: 'Yes, we occasionally offer discount codes. You can apply these at checkout to receive a discount on your order. However, discount codes cannot be combined with Eclipse+ membership discounts.',
      },
      {
        question: 'What is Eclipse+ and what discounts does it offer?',
        answer: 'Eclipse+ is our premium membership (£4.99/month) that provides 30% off standard products and 35% off Bots, plus one free product claim per month. Eclipse+ discounts are automatically applied at checkout and cannot be combined with promotional discount codes. Products in the "Eclipse Savers" category are already discounted and excluded from Eclipse+ benefits.',
      },
      {
        question: 'Can I use a discount code with my Eclipse+ membership?',
        answer: 'No, Eclipse+ membership discounts cannot be combined with promotional discount codes. When Eclipse+ discounts are applied to your order, the discount code field will not be available. This ensures you always receive the best possible discount automatically.',
      },
    ],
  },
  {
    category: 'Accounts & Security',
    questions: [
      {
        question: 'Do I need an account to purchase?',
        answer: 'Yes, you need to create an account to purchase and download products. This ensures you can always access your purchases.',
      },
      {
        question: 'How do I reset my password?',
        answer: 'Click on "Sign In" and then use the "Forgot Password" link. You\'ll receive an email with instructions to reset your password.',
      },
      {
        question: 'Is my payment information secure?',
        answer: 'Absolutely. We use industry-standard encryption and never store your full payment details. All transactions are processed securely through Stripe or PayPal.',
      },
    ],
  },
  {
    category: 'Refunds & Support',
    questions: [
      {
        question: 'What is your refund policy?',
        answer: 'As we sell digital products, refunds are handled on a case-by-case basis in accordance with UK Consumer Rights Act 2015. Please see our Refund Policy page for full details.',
      },
      {
        question: 'How do I request a refund?',
        answer: 'Contact our support team via the live chat or email with your order number and reason for the refund request. We aim to respond within 24-48 hours.',
      },
      {
        question: 'How can I get support?',
        answer: 'You can reach us through our live chat widget on the website, join our Discord community, or visit the Support Centre for help articles.',
      },
    ],
  },
  {
    category: 'Community & Forum',
    questions: [
      {
        question: 'How do I join the community forum?',
        answer: 'Simply sign in to your account and visit the Forum section. You can browse discussions and create new threads once logged in.',
      },
      {
        question: 'Can I join your Discord server?',
        answer: 'Yes! We have an active Discord community where you can chat with other users and get support. Click the Discord link in the navigation to join.',
      },
    ],
  },
];

export default function FAQ() {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <HelpCircle className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-display font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-muted-foreground text-lg">
            Find answers to common questions about {SITE_NAME}
          </p>
        </div>

        <div className="space-y-8">
          {faqItems.map((category, categoryIndex) => (
            <Card key={categoryIndex} className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">{category.category}</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="space-y-2">
                  {category.questions.map((item, itemIndex) => (
                    <AccordionItem
                      key={itemIndex}
                      value={`${categoryIndex}-${itemIndex}`}
                      className="bg-muted/30 border border-border rounded-lg px-4"
                    >
                      <AccordionTrigger className="text-left hover:no-underline">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Still have questions card */}
        <Card className="bg-card border-border mt-12">
          <CardContent className="pt-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
              <Headphones className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2">Still have questions?</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Our support team is here to help. Use the live chat or visit our Support Centre.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                variant="outline" 
                onClick={() => {
                  const chatButton = document.querySelector('[data-chat-widget]');
                  if (chatButton instanceof HTMLElement) chatButton.click();
                }}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Open Live Chat
              </Button>
              <Button asChild className="gradient-button border-0">
                <Link to="/support">Visit Support Centre</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

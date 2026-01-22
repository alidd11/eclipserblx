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
        answer: `We focus on premium Roblox assets — things like vehicle liveries, UI kits, scripts, and Discord bots. Everything's made by creators who actually use this stuff themselves.`,
      },
      {
        question: 'How do I download my purchased products?',
        answer: 'Easy! After you buy something, head to your Account page and hit "Downloads". All your stuff will be waiting there, ready to grab.',
      },
      {
        question: 'Is there a download limit?',
        answer: 'Here\'s the deal: there\'s a 48-hour cooldown between downloads to keep things fair for everyone. After grabbing one product, just wait a couple days before downloading the next.',
      },
      {
        question: 'Can I re-download my purchases?',
        answer: 'Absolutely! Your purchases are yours forever. Re-download anytime from your Downloads page — just keep the 48-hour cooldown in mind.',
      },
    ],
  },
  {
    category: 'Payments & Pricing',
    questions: [
      {
        question: 'What payment methods do you accept?',
        answer: 'We keep it simple — all major cards work (Visa, Mastercard, Amex) through Stripe, and PayPal too if that\'s your thing.',
      },
      {
        question: 'Are prices inclusive of VAT?',
        answer: 'Yep! What you see is what you pay. All prices include UK VAT where it applies.',
      },
      {
        question: 'Do you offer discount codes?',
        answer: 'We do! Keep an eye on our Discord for codes. Quick heads up though — you can\'t stack discount codes with Eclipse+ membership discounts.',
      },
      {
        question: 'What is Eclipse+ and what discounts does it offer?',
        answer: 'Eclipse+ is our membership for serious creators — £4.99/month gets you 30% off standard products, 35% off Bots, and one free product each month. The discounts apply automatically at checkout. One thing to note: "Eclipse Savers" products are already discounted, so they\'re excluded from the membership perks.',
      },
      {
        question: 'Can I use a discount code with my Eclipse+ membership?',
        answer: 'Unfortunately not — it\'s one or the other. But honestly, the Eclipse+ discount is usually better anyway, and it applies automatically so you don\'t have to remember codes.',
      },
    ],
  },
  {
    category: 'Accounts & Security',
    questions: [
      {
        question: 'Do I need an account to purchase?',
        answer: 'Yeah, you\'ll need one. It only takes a minute to sign up, and it means you\'ll always have access to everything you\'ve bought.',
      },
      {
        question: 'How do I reset my password?',
        answer: 'No worries, happens to everyone. Hit "Sign In", click "Forgot Password", and check your email. You\'ll get a reset link within a few minutes.',
      },
      {
        question: 'Is my payment information secure?',
        answer: 'Totally. We use industry-standard encryption, and we never actually see or store your card details — Stripe and PayPal handle all that securely.',
      },
    ],
  },
  {
    category: 'Refunds & Support',
    questions: [
      {
        question: 'What is your refund policy?',
        answer: 'Since everything\'s digital, we handle refunds case-by-case following UK Consumer Rights. Check our Refund Policy page for the full details, but the short version: if something\'s genuinely wrong, we\'ll sort it out.',
      },
      {
        question: 'How do I request a refund?',
        answer: 'Drop us a message via live chat or email with your order number and what went wrong. We usually get back to you within a few hours during the week, 24-48 hours max.',
      },
      {
        question: 'How can I get support?',
        answer: 'A few options: the live chat on this site (Mon-Sat, 9AM-7PM), our Discord community where other creators can help too, or the Support Centre for guides and articles.',
      },
    ],
  },
  {
    category: 'Community & Forum',
    questions: [
      {
        question: 'How do I join the community forum?',
        answer: 'Just sign in and head to the Forum section — that\'s it! Browse around, jump into discussions, or start your own thread.',
      },
      {
        question: 'Can I join your Discord server?',
        answer: 'For sure! It\'s actually the best place to hang out, get quick help, and see what other creators are working on. Link\'s in the nav bar.',
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

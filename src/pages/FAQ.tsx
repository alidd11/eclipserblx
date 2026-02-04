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
import { usePageTracking } from '@/hooks/usePageTracking';

const faqItems = [
  {
    category: 'Products & Downloads',
    questions: [
      {
        question: 'What types of Roblox assets do you sell?',
        answer: `We specialise in premium Roblox roleplay assets — vehicle liveries for emergency services, custom UI kits, scripts & systems, and Discord bots tailored for roleplay communities. Everything's made by experienced Roblox developers who understand what roleplay servers need.`,
      },
      {
        question: 'How do I use vehicle liveries in my Roblox game?',
        answer: 'After purchasing, download the livery files from your Account page. You\'ll get high-resolution texture files that can be applied to compatible vehicle models in Roblox Studio. Each product includes setup instructions specific to that livery pack.',
      },
      {
        question: 'Are your scripts compatible with my existing game?',
        answer: 'Most of our scripts are designed to work standalone or integrate with popular roleplay frameworks. Check the product description for compatibility info. If you\'re unsure, drop us a message before purchasing — we\'re happy to help.',
      },
      {
        question: 'Is there a download limit?',
        answer: 'There\'s a 48-hour cooldown between downloads to keep things fair for everyone. After grabbing one product, just wait a couple of days before downloading the next. You can always re-download your purchases anytime.',
      },
      {
        question: 'Do you offer updates for purchased products?',
        answer: 'Yes! When we update a product (new liveries, bug fixes, improvements), you\'ll have access to the updated version for free. Just re-download from your account to get the latest files.',
      },
    ],
  },
  {
    category: 'Roblox Integration',
    questions: [
      {
        question: 'How do I verify my Roblox account?',
        answer: 'Head to your Account page and click "Link Roblox Account". You\'ll get a verification code to add to your Roblox profile description. Once verified, you\'ll unlock features like game pass verification and group membership perks.',
      },
      {
        question: 'Do I need Roblox Premium to use your products?',
        answer: 'Nope! Our products work whether you have Roblox Premium or not. Some products may have enhanced features for Premium users, but the core functionality is always available to everyone.',
      },
      {
        question: 'Can I use these assets in my group\'s roleplay server?',
        answer: 'Absolutely! Our products are licensed for use in your Roblox experiences. Just don\'t redistribute the files themselves. One purchase covers your group\'s server — no need to buy multiple copies.',
      },
      {
        question: 'Do you support Roblox Studio plugins?',
        answer: 'Some of our products include Studio plugins for easier setup. Check the product description to see if a plugin is included. We\'re always working on making installation as smooth as possible.',
      },
    ],
  },
  {
    category: 'Payments & Pricing',
    questions: [
      {
        question: 'What payment methods do you accept?',
        answer: 'We accept all major cards (Visa, Mastercard, Amex) through Stripe, plus PayPal. All transactions are secure and we never store your card details.',
      },
      {
        question: 'Are prices inclusive of VAT?',
        answer: 'Yep! What you see is what you pay. All prices include UK VAT where applicable.',
      },
      {
        question: 'What is Eclipse+ and how does it help Roblox developers?',
        answer: 'Eclipse+ is our membership for serious Roblox creators — £3.99/month gets you 30% off standard products, 35% off Bots, early access to new releases, and one free product each month. Perfect if you\'re regularly updating your roleplay server.',
      },
      {
        question: 'Do you offer group discounts for roleplay communities?',
        answer: 'We do! If you\'re running a large roleplay community and need multiple products or custom work, reach out to us. We offer bulk pricing and can discuss custom packages for established groups.',
      },
      {
        question: 'Can I use Robux to purchase products?',
        answer: 'Currently we accept GBP payments through Stripe and PayPal. We\'re exploring Robux payment options for the future — join our Discord to stay updated!',
      },
    ],
  },
  {
    category: 'Discord Bots',
    questions: [
      {
        question: 'How do I set up a purchased Discord bot?',
        answer: 'After purchase, you\'ll receive an installation code in your account. Use this code with our bot setup guide to add the bot to your Discord server. The process takes about 5 minutes and we\'ve got step-by-step instructions.',
      },
      {
        question: 'Can I customise the bot for my roleplay server?',
        answer: 'Yes! Our bots come with extensive configuration options through the web dashboard. Customise commands, permissions, role integrations, and more to fit your server\'s needs.',
      },
      {
        question: 'Do bots work with Roblox verification systems?',
        answer: 'Our bots integrate with popular Roblox verification systems like Bloxlink and RoVer. Some bots also have built-in Roblox verification features for seamless member management.',
      },
      {
        question: 'What happens if the bot goes offline?',
        answer: 'Our bots are hosted on reliable infrastructure with 99.9% uptime. If there\'s ever an issue, our team monitors 24/7 and you can always reach out via live chat or Discord for support.',
      },
    ],
  },
  {
    category: 'Accounts & Security',
    questions: [
      {
        question: 'Do I need an account to purchase?',
        answer: 'Yes, you\'ll need one. It only takes a minute to sign up, and it means you\'ll always have access to your purchases, downloads, and any linked Roblox accounts.',
      },
      {
        question: 'How do I reset my password?',
        answer: 'No worries, happens to everyone. Hit "Sign In", click "Forgot Password", and check your email. You\'ll get a reset link within a few minutes.',
      },
      {
        question: 'Is my Roblox account information secure?',
        answer: 'We only store your public Roblox user ID and username for verification purposes. We never have access to your Roblox password or private account details. All data is encrypted and stored securely.',
      },
    ],
  },
  {
    category: 'Refunds & Support',
    questions: [
      {
        question: 'What is your refund policy for digital Roblox assets?',
        answer: 'Since all products are digital downloads, we handle refunds case-by-case following UK Consumer Rights. If a product doesn\'t work as described or you\'re having technical issues we can\'t resolve, we\'ll sort it out. Reach out within 14 days of purchase.',
      },
      {
        question: 'A script isn\'t working in my game — what do I do?',
        answer: 'First, check the product\'s setup guide and compatibility requirements. If you\'re still stuck, open a live chat or Discord ticket with details about the error. Our team can usually help troubleshoot within a few hours.',
      },
      {
        question: 'How can I get support?',
        answer: 'A few options: live chat on this site (Mon-Sat, 9AM-7PM UK), our Discord community where other Roblox developers can help too, or the Support Centre for guides and setup articles.',
      },
      {
        question: 'Do you offer custom development for roleplay servers?',
        answer: 'We occasionally take on custom projects for established roleplay communities. If you need bespoke liveries, scripts, or systems, reach out through our contact form with details about your project.',
      },
    ],
  },
  {
    category: 'Community & Forum',
    questions: [
      {
        question: 'How do I join the community forum?',
        answer: 'Just sign in and head to the Forum section — that\'s it! Share your roleplay server, get feedback on setups, or discuss Roblox development with other creators.',
      },
      {
        question: 'Can I showcase my roleplay server using your assets?',
        answer: 'We\'d love to see it! Share in our Discord or forum. We regularly feature impressive servers that use our products — great way to get exposure for your community.',
      },
      {
        question: 'Do you have a Discord server?',
        answer: 'Absolutely! Our Discord is the best place to hang out, get quick support, see sneak peeks of new products, and connect with other Roblox roleplay developers. Link\'s in the nav bar.',
      },
    ],
  },
];

export default function FAQ() {
  usePageTracking({ pagePath: '/faq' });
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <HelpCircle className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-display font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-muted-foreground text-lg">
            Find answers to common questions about {SITE_NAME} and our Roblox assets
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
              Our support team is here to help with any Roblox development questions. Use the live chat or visit our Support Centre.
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

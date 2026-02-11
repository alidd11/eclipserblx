import { SellerDocumentPage } from "@/components/seller/documents/SellerDocumentPage";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  HelpCircle, ShoppingCart, Wallet, Settings, Shield,
  Package, Users, Bot
} from "lucide-react";

interface FAQSection {
  icon: typeof HelpCircle;
  title: string;
  questions: { q: string; a: string }[];
}

const faqSections: FAQSection[] = [
  {
    icon: ShoppingCart,
    title: "Selling & Orders",
    questions: [
      {
        q: "How do I list a new product?",
        a: "Go to Products → New Product in your seller dashboard. Add a title, description, images (up to 4), set your price, choose a category, and upload your product files. All products are reviewed within 24-48 hours before going live.",
      },
      {
        q: "What happens when someone buys my product?",
        a: "You'll receive a notification (and a Discord webhook if configured). The buyer gets instant access to the digital files. Your earnings are calculated and added to your seller balance, available for payout.",
      },
      {
        q: "Can I offer discounts on my products?",
        a: "Yes! Go to the Discounts section in your seller dashboard. You can create percentage-based or fixed-amount discount codes, set expiry dates, and limit usage counts.",
      },
      {
        q: "What is the minimum product price?",
        a: "The minimum price is £1.00. There is no maximum price limit. Price your products based on value and market research.",
      },
      {
        q: "Can I schedule a product release?",
        a: "Yes, you can set a future release date when creating or editing a product. The product will automatically go live at the scheduled time.",
      },
      {
        q: "What if a buyer requests a refund?",
        a: "Refunds are handled through our support system. If a refund is approved, the corresponding earnings are deducted from your seller balance. The platform covers any chargeback fees.",
      },
    ],
  },
  {
    icon: Wallet,
    title: "Earnings & Payouts",
    questions: [
      {
        q: "How much do I earn per sale?",
        a: "Base sellers keep 85% of net earnings (after Stripe fees). Eclipse+ member sellers keep 90%. Commission is calculated AFTER payment processing fees, not on the gross amount.",
      },
      {
        q: "When can I request a payout?",
        a: "You can request a payout once your available balance reaches £5.00 or more. There's no maximum limit.",
      },
      {
        q: "How long do payouts take?",
        a: "Stripe Connect: 2-7 business days (automatic). PayPal: 3-5 business days (manual request). Bank Transfer via Wise: 5-7 business days (manual request).",
      },
      {
        q: "Do Eclipse+ buyer discounts affect my earnings?",
        a: "No. When an Eclipse+ member buys your product at a discounted price, the platform absorbs the discount. You always earn based on the full listing price.",
      },
      {
        q: "Are there any hidden fees?",
        a: "No. The only deductions are the Stripe payment processing fee (1.5% + £0.20 for UK transactions) and the platform commission. Everything is transparent in your earnings dashboard.",
      },
    ],
  },
  {
    icon: Settings,
    title: "Store Management",
    questions: [
      {
        q: "How do I customize my storefront?",
        a: "Go to Settings → Appearance. Choose from 5 themes, 7 accent colors, upload a custom logo and banner, select fonts, and configure your announcement bar.",
      },
      {
        q: "Can I have team members manage my store?",
        a: "Yes! Go to Settings → Team to invite members with different roles: Admin (full access), Editor (product management), or Viewer (read-only dashboard access).",
      },
      {
        q: "How do I add categories to my store?",
        a: "Go to the Categories section in your sidebar. You can enable/disable global marketplace categories for your specific storefront. Only enabled categories appear on your store page.",
      },
      {
        q: "Can I change my store name or URL?",
        a: "Your store name can be updated in Settings → Profile. Your store URL (slug) is set during application approval. Contact support if you need to change your URL.",
      },
      {
        q: "How do I set up Discord notifications?",
        a: "Go to Settings → Notifications or the Discord section. Add your webhook URLs for sales alerts and review notifications. You can use separate webhooks for different notification types.",
      },
    ],
  },
  {
    icon: Shield,
    title: "Security & Compliance",
    questions: [
      {
        q: "How does product scanning work?",
        a: "All uploaded files are automatically scanned for malware via Cloudmersive and for Lua backdoors using our AI analysis system. Products that fail scanning are flagged for review.",
      },
      {
        q: "What happens if my product is flagged?",
        a: "You'll receive a notification explaining the issue. You can fix the problem and resubmit. Common flags include detected obfuscated code or suspicious API calls in scripts.",
      },
      {
        q: "Are my payment details secure?",
        a: "Yes. Payment credentials are stored in a separate encrypted table with strict access controls. Only you can view and update your payment information.",
      },
      {
        q: "Can I sell on other platforms simultaneously?",
        a: "Yes! You retain full ownership of your assets. Eclipse only receives a license to display and sell on our platform. You're free to sell anywhere else.",
      },
    ],
  },
  {
    icon: Bot,
    title: "Bot Licensing",
    questions: [
      {
        q: "How does bot licensing work?",
        a: "Register your Discord bot in the Bots section, then sell installation codes. Buyers use these codes to activate your bot in their server. The platform provides a validation API.",
      },
      {
        q: "Can I sell license bundles?",
        a: "Yes, you can create bundle pricing (e.g., 3 licenses at a discount). Configure bundles in your bot product settings.",
      },
      {
        q: "What happens if a license is deactivated?",
        a: "You or the buyer can deactivate a license. The bot should check the license status via the API on startup. Deactivated licenses can be reactivated if needed.",
      },
    ],
  },
  {
    icon: Users,
    title: "Account & Support",
    questions: [
      {
        q: "How do I contact support?",
        a: "Use the Support section in your seller dashboard for direct messaging with our team. You can also reach us via the main site's contact form or our Discord server.",
      },
      {
        q: "Can I close my store?",
        a: "Contact support to request store closure. Your existing buyers will retain access to purchased products. Any pending balance will be paid out before closure.",
      },
      {
        q: "How do I earn Trusted Seller status?",
        a: "Trusted Seller status is awarded based on consistent product quality, positive reviews, reliable delivery, and adherence to community guidelines. It's reviewed periodically by our team.",
      },
      {
        q: "What if I need to take a break from selling?",
        a: "You can temporarily disable your store's visibility without losing any data. Your products and settings will be preserved for when you're ready to return.",
      },
    ],
  },
];

export default function SellerFAQ() {
  return (
    <SellerDocumentPage
      title="FAQ & Troubleshooting"
      subtitle="Answers to the most common seller questions"
    >
      <div className="space-y-8">
        {faqSections.map((section, i) => (
          <section key={i} className="space-y-3">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <section.icon className="h-5 w-5 text-primary" />
              {section.title}
            </h2>
            <Card className="border-border/50">
              <CardContent className="pt-2 pb-2">
                <Accordion type="multiple" className="w-full">
                  {section.questions.map((faq, j) => (
                    <AccordionItem key={j} value={`${i}-${j}`} className="border-border/50">
                      <AccordionTrigger className="text-left text-sm font-medium hover:no-underline py-4">
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground pb-4">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </section>
        ))}

        {/* Still need help */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6 text-center">
            <HelpCircle className="h-8 w-8 text-primary mx-auto mb-3" />
            <h3 className="font-bold text-lg mb-2">Still Have Questions?</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Can't find what you're looking for? Reach out to our support team through the seller dashboard 
              or join our Discord community for quick help from staff and fellow sellers.
            </p>
          </CardContent>
        </Card>
      </div>
    </SellerDocumentPage>
  );
}

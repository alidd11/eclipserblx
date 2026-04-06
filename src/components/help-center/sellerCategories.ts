import {
  Store, DollarSign, Settings, Shield, Bot, Users, FileText,
} from 'lucide-react';
import type { HelpCategory } from './HelpCenterComponents';

export const sellerCategories: HelpCategory[] = [
  {
    id: 'getting-started',
    icon: Store,
    title: 'Getting Started as a Seller',
    description: 'How to apply, set up, and launch your store.',
    color: 'text-primary',
    articles: [
      {
        question: 'How do I become a seller?',
        answer: 'Visit the "Sell on Eclipse" page or go to Account → Become a Seller. You\'ll need to apply with your Discord server details and agree to our Seller Terms of Service.',
      },
      {
        question: 'What products can I sell?',
        answer: 'You can sell digital products like Roblox scripts, models, plugins, Discord bots, graphics, templates, and more. All products must comply with our Terms of Service.',
      },
      {
        question: 'How do I list a new product?',
        answer: 'Go to Products → New Product in your seller dashboard. Add a title, description, images (up to 4), set your price, choose a category, and upload your product files. All products are reviewed within 24-48 hours before going live.',
      },
      {
        question: 'What is the minimum product price?',
        answer: 'The minimum price is £1.00. There is no maximum price limit. Price your products based on value and market research.',
      },
      {
        question: 'How does the review process work?',
        answer: 'All new product listings go through a moderation review before being published. Bot products require additional manual verification from our staff to prevent scams.',
      },
      {
        question: 'Can I schedule a product release?',
        answer: 'Yes, you can set a future release date when creating or editing a product. The product will automatically go live at the scheduled time.',
      },
    ],
  },
  {
    id: 'earnings',
    icon: DollarSign,
    title: 'Earnings & Payouts',
    description: 'Commission rates, payouts, and financials.',
    color: 'text-green-500',
    articles: [
      {
        question: 'What are the commission rates?',
        answer: 'Sellers keep 85% of net earnings (after Stripe fees). Pro+ member sellers keep 90%. Commission is calculated AFTER payment processing fees, not on the gross amount.',
      },
      {
        question: 'When can I request a payout?',
        answer: 'You can request a payout once your available balance reaches £5.00 or more. There\'s no maximum limit.',
      },
      {
        question: 'How long do payouts take?',
        answer: 'Stripe Connect: 2-7 business days (automatic). PayPal: 3-5 business days (manual request). Bank Transfer via Wise: 5-7 business days (manual request).',
      },
      {
        question: 'Do Eclipse+ buyer discounts affect my earnings?',
        answer: 'No. When an Eclipse+ member buys your product at a discounted price, the platform absorbs the discount. You always earn based on the full listing price.',
      },
      {
        question: 'Are there any hidden fees?',
        answer: 'No. The only deductions are the Stripe payment processing fee (1.5% + £0.20 for UK transactions) and the platform commission. Everything is transparent in your earnings dashboard.',
      },
      {
        question: 'What if a buyer requests a refund?',
        answer: 'Refunds are handled through our support system. If a refund is approved, the corresponding earnings are deducted from your seller balance. The platform covers any chargeback fees.',
      },
    ],
  },
  {
    id: 'store-management',
    icon: Settings,
    title: 'Store Management',
    description: 'Customise your storefront and team.',
    color: 'text-blue-500',
    articles: [
      {
        question: 'How do I customise my storefront?',
        answer: 'Go to Settings → Appearance. Choose from 5 themes, 7 accent colors, upload a custom logo and banner, select fonts, and configure your announcement bar.',
      },
      {
        question: 'Can I have team members manage my store?',
        answer: 'Yes! Go to Settings → Team to invite members with different roles: Admin (full access), Editor (product management), or Viewer (read-only dashboard access).',
      },
      {
        question: 'How do I add categories to my store?',
        answer: 'Go to the Categories section in your sidebar. You can enable/disable global marketplace categories for your specific storefront. Only enabled categories appear on your store page.',
      },
      {
        question: 'Can I change my store name or URL?',
        answer: 'Your store name can be updated in Settings → Profile. Your store URL (slug) is set during application approval. Contact support if you need to change your URL.',
      },
      {
        question: 'How do I set up Discord notifications?',
        answer: 'Go to Settings → Notifications or the Discord section. Add your webhook URLs for sales alerts and review notifications. You can use separate webhooks for different notification types.',
      },
    ],
  },
  {
    id: 'security',
    icon: Shield,
    title: 'Security & Compliance',
    description: 'Product scanning, IP rights, and data safety.',
    color: 'text-red-500',
    articles: [
      {
        question: 'How does product scanning work?',
        answer: 'All uploaded files are automatically scanned for malware via Cloudmersive and for Lua backdoors using our AI analysis system. Products that fail scanning are flagged for review.',
      },
      {
        question: 'What happens if my product is flagged?',
        answer: 'You\'ll receive a notification explaining the issue. You can fix the problem and resubmit. Common flags include detected obfuscated code or suspicious API calls in scripts.',
      },
      {
        question: 'Are my payment details secure?',
        answer: 'Yes. Payment credentials are stored in a separate encrypted table with strict access controls. Only you can view and update your payment information.',
      },
      {
        question: 'Can I sell on other platforms simultaneously?',
        answer: 'Yes! You retain full ownership of your assets. Eclipse only receives a license to display and sell on our platform. You\'re free to sell anywhere else.',
      },
    ],
  },
  {
    id: 'bot-licensing',
    icon: Bot,
    title: 'Bot Licensing',
    description: 'Sell and manage Discord bot licenses.',
    color: 'text-indigo-500',
    articles: [
      {
        question: 'How does bot licensing work?',
        answer: 'Register your Discord bot in the Bots section, then sell installation codes. Buyers use these codes to activate your bot in their server. The platform provides a validation API.',
      },
      {
        question: 'Can I sell license bundles?',
        answer: 'Yes, you can create bundle pricing (e.g., 3 licenses at a discount). Configure bundles in your bot product settings.',
      },
      {
        question: 'What happens if a license is deactivated?',
        answer: 'You or the buyer can deactivate a license. The bot should check the license status via the API on startup. Deactivated licenses can be reactivated if needed.',
      },
    ],
  },
  {
    id: 'ip-protection',
    icon: FileText,
    title: 'IP Protection',
    description: 'Protect your creative work from theft.',
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
    id: 'account-support',
    icon: Users,
    title: 'Account & Support',
    description: 'Help with your seller account.',
    color: 'text-pink-500',
    articles: [
      {
        question: 'How do I contact support?',
        answer: 'Use the Support section in your seller dashboard for direct messaging with our team. You can also reach us via the main site\'s contact form or our Discord server.',
      },
      {
        question: 'Can I close my store?',
        answer: 'Contact support to request store closure. Your existing buyers will retain access to purchased products. Any pending balance will be paid out before closure.',
      },
      {
        question: 'How do I earn Trusted Seller status?',
        answer: 'Trusted Seller status is awarded based on consistent product quality, positive reviews, reliable delivery, and adherence to community guidelines. It\'s reviewed periodically by our team.',
      },
      {
        question: 'What if I need to take a break from selling?',
        answer: 'You can temporarily disable your store\'s visibility without losing any data. Your products and settings will be preserved for when you\'re ready to return.',
      },
    ],
  },
];

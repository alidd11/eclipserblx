import {
  Sparkles, ShoppingCart, Download, CreditCard, RefreshCw,
  Bot, Shield, Link2, FileText,
} from 'lucide-react';
import { SITE_NAME } from '@/lib/constants';
import type { HelpCategory } from './HelpCenterComponents';

export const buyerCategories: HelpCategory[] = [
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
        answer: 'Go to Account → Settings and click "Link Discord". This unlocks community features, bot licenses, and Discord-exclusive perks.',
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
        question: 'Is there a download limit?',
        answer: 'Yes — you can download each product up to 5 times per day, with a global limit of 15 downloads per hour across all products. This helps ensure fair usage and prevent abuse.',
      },
      {
        question: 'What if my download fails?',
        answer: 'If your download fails, try again — you have up to 5 attempts per product per day. If the issue persists, open a support ticket and our team will help.',
      },
      {
        question: 'Can I download on multiple devices?',
        answer: 'Yes. You can download your purchased products on any device as long as you\'re logged into your account.',
      },
      {
        question: 'How long do I have access to my purchases?',
        answer: 'Once purchased, you have lifetime access to download your products (subject to daily download limits).',
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

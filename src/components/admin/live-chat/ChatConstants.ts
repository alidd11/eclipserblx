export const CANNED_RESPONSES = [
  {
    category: 'Greetings',
    responses: [
      { label: 'Welcome', text: 'Hi there! 👋 Thanks for reaching out to Eclipse support. I\'m here to help you with any questions or issues. How can I assist you today?' },
      { label: 'Thanks for waiting', text: 'Thank you so much for your patience! I\'ve reviewed your inquiry and I\'m ready to help you now. Let\'s get this sorted out together.' },
      { label: 'Returning customer', text: 'Welcome back! It\'s great to hear from you again. I can see your previous conversations – how can I help you today?' },
    ],
  },
  {
    category: 'Order Issues',
    responses: [
      { label: 'Order lookup', text: 'I\'d be happy to look into your order for you! Could you please provide either your order ID (starts with "ORD-" or a UUID) or the email address you used when placing the order? This will help me locate it quickly.' },
      { label: 'Order processing', text: 'Great news! Orders are typically processed instantly for digital products. Once payment is confirmed, your downloads become available immediately in your Account → Downloads section. If you\'re not seeing them, please ensure you\'re logged into the same account used for the purchase.' },
      { label: 'Order confirmation', text: 'Your order confirmation email should arrive within a few minutes of purchase. Please check your spam/junk folder if you don\'t see it. The email will contain your order details and a direct link to access your downloads.' },
      { label: 'Order not received', text: 'I\'m sorry to hear you haven\'t received your order. Let me investigate this for you. Can you confirm the email address used for the purchase? I\'ll check our system and make sure everything is properly linked to your account.' },
    ],
  },
  {
    category: 'Downloads',
    responses: [
      { label: 'How to download', text: 'To download your purchased items:\n\n1. Log into your account\n2. Go to Account → Downloads\n3. Click the download button next to your product\n\nIf you\'re having trouble finding it, let me know the product name and I\'ll help locate it.' },
      { label: 'Download not working', text: 'I\'m sorry you\'re experiencing download issues. Let\'s troubleshoot:\n\n• Try a different browser (Chrome/Firefox work best)\n• Disable any ad blockers temporarily\n• Check if your internet connection is stable\n\nIf the issue persists, please let me know the exact error message you\'re seeing.' },
      { label: 'Download limit reached', text: 'I understand you\'ve reached the download limit. Don\'t worry – I can help! For security reasons, we limit downloads to 5 per product per day (and 15 per hour globally). I\'ve reset your download count, so you should now be able to download it again. Please try once more and let me know if it works!' },
      { label: 'File corrupted', text: 'I\'m sorry to hear the file appears corrupted. This can sometimes happen due to incomplete downloads. Here\'s what I recommend:\n\n1. Delete the corrupted file\n2. Clear your browser cache\n3. Try downloading again using a wired connection if possible\n\nIf the issue continues, I\'ll arrange an alternative delivery method for you.' },
    ],
  },
  {
    category: 'Payments',
    responses: [
      { label: 'Payment security', text: 'Your payment security is our top priority! All transactions are processed through Stripe, a PCI Level 1 certified payment provider (the highest security standard). Your card details are encrypted end-to-end and are never stored on our servers. You can pay with confidence!' },
      { label: 'Payment methods', text: 'We offer flexible payment options to suit your needs:\n\n• Credit/Debit Cards (Visa, Mastercard, Amex)\n• Apple Pay & Google Pay\n• Klarna (Buy Now, Pay Later)\n\nAll payment methods are processed securely through Stripe.' },
      { label: 'Payment failed', text: 'I\'m sorry your payment didn\'t go through. Common reasons include:\n\n• Insufficient funds\n• Card security limits triggered\n• Incorrect card details\n\nPlease try again or use a different payment method. If you continue to have issues, your bank may be able to provide more details.' },
      { label: 'Double charged', text: 'I understand how concerning a double charge can be! Let me check our records right away. Could you provide the email used for purchase and the approximate amounts/dates you\'re seeing? If there was indeed an accidental double charge, I\'ll ensure a full refund is processed immediately.' },
    ],
  },
  {
    category: 'Refunds',
    responses: [
      { label: 'Refund policy', text: 'Our refund policy is designed to be fair and straightforward:\n\n• 30-day money-back guarantee on all digital products\n• Refunds are processed within 3-5 business days\n• Full refund provided for unused products\n\nCould you please share your order details so I can start the refund process?' },
      { label: 'Refund initiated', text: 'Great news! I\'ve initiated your refund request. Here\'s what to expect:\n\n• Processing time: 3-5 business days\n• The refund will appear on your original payment method\n• You\'ll receive a confirmation email once it\'s processed\n\nPlease note that some banks may take an additional few days to reflect the credit.' },
      { label: 'Partial refund', text: 'I understand you\'d like a partial refund. I can certainly help with that! To process this accurately, could you let me know:\n\n1. Which specific item(s) you\'d like refunded\n2. The reason for the refund\n\nThis helps us improve our products for everyone.' },
    ],
  },
  {
    category: 'Technical',
    responses: [
      { label: 'Compatibility', text: 'Great question about compatibility! Most of our digital products work with:\n\n• Windows 10/11 and macOS 10.14+\n• Standard software (Photoshop, Illustrator, etc.)\n\nCould you tell me which specific product you\'re asking about? I can provide detailed compatibility information.' },
      { label: 'Installation help', text: 'I\'d be happy to help you install your product! To give you the best guidance:\n\n1. What product did you purchase?\n2. What operating system are you using?\n3. What software will you be using it with?\n\nOnce I have these details, I can walk you through the installation step by step.' },
      { label: 'Product not working', text: 'I\'m sorry you\'re experiencing issues with your product. Let\'s get this resolved! Please share:\n\n• Product name\n• What you\'re trying to do\n• Any error messages you see\n• Screenshots if possible\n\nWith these details, I can provide specific troubleshooting steps.' },
    ],
  },
  {
    category: 'Account',
    responses: [
      { label: 'Password reset', text: 'Need to reset your password? No problem! You can:\n\n1. Go to the login page\n2. Click "Forgot Password"\n3. Enter your email address\n4. Check your inbox for the reset link\n\nIf you don\'t receive the email within a few minutes, check your spam folder or let me know and I\'ll help.' },
      { label: 'Email change', text: 'I can help you update your email address! For security, I\'ll need to verify your identity first. Could you please confirm:\n\n1. Your current email address\n2. The new email you\'d like to use\n\nOnce verified, I\'ll update your account right away.' },
      { label: 'Account access', text: 'Having trouble accessing your account? Let me help! Please try these steps:\n\n1. Clear your browser cache and cookies\n2. Try the "Forgot Password" option\n3. Ensure you\'re using the correct email\n\nIf you\'re still locked out, I can look into your account directly.' },
    ],
  },
  {
    category: 'Closing',
    responses: [
      { label: 'Anything else', text: 'I\'m glad I could help! Is there anything else I can assist you with today? I\'m happy to answer any other questions you might have.' },
      { label: 'Issue resolved', text: 'Wonderful! I\'m so glad we could get that sorted out for you. 🎉 If you have any questions in the future, don\'t hesitate to reach out. We\'re always here to help!' },
      { label: 'Feedback request', text: 'Thank you for chatting with us today! If you have a moment, we\'d love to hear about your experience. Your feedback helps us improve our support. Have a fantastic day! ✨' },
      { label: 'Goodbye', text: 'Thank you for choosing Eclipse! If you need anything else in the future, we\'re just a message away. Take care and have a wonderful day! 👋' },
    ],
  },
];

export interface Conversation {
  id: string;
  user_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  status: string;
  issue_category: string | null;
  created_at: string;
  updated_at: string;
}

export type MessageStatus = 'pending' | 'sent' | 'failed';

export interface SecureData {
  verified: boolean;
  masked_code: string;
  product_name?: string;
  code_id?: string;
}

export interface Message {
  id: string;
  message: string;
  sender_type: string;
  sender_id: string | null;
  created_at: string;
  attachment_url: string | null;
  message_type?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  secure_data?: any;
  _status?: MessageStatus;
  _tempId?: string;
}

export const ISSUE_CATEGORY_LABELS: Record<string, string> = {
  order: 'Order Issue',
  download: 'Download',
  payment: 'Payment',
  product: 'Product',
  refund: 'Refund',
  technical: 'Technical',
  other: 'Other',
};

export const ISSUE_CATEGORY_COLORS: Record<string, string> = {
  order: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  download: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  payment: 'bg-green-500/20 text-green-400 border-green-500/30',
  product: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  refund: 'bg-red-500/20 text-red-400 border-red-500/30',
  technical: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  other: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

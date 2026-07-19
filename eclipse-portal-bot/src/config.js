// Environment variable validation and constants

const required = [
  'DISCORD_CUSTOMER_BOT_TOKEN',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}

export const config = {
  // Discord
  botToken: process.env.DISCORD_CUSTOMER_BOT_TOKEN,
  mainGuildId: process.env.DISCORD_GUILD_ID || '',

  // Role IDs
  customerRoleId: process.env.DISCORD_CUSTOMER_ROLE_ID || '',
  loyalCustomerRoleId: process.env.DISCORD_LOYAL_CUSTOMER_ROLE_ID || '',
  storeCreatorRoleId: process.env.DISCORD_STORE_CREATOR_ROLE_ID || '',
  verifiedSellerRoleId: process.env.DISCORD_VERIFIED_SELLER_ROLE_ID || '',

  // Supabase
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,

  // Optional
  webhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
  siteUrl: process.env.SITE_URL || 'https://eclipserblx.com',
};

// Branding constants
export const ECLIPSE_COLOR = 0x8b5cf6;
export const ECLIPSE_ICON = 'https://qlnbergwjfrmgkjhrbkj.supabase.co/storage/v1/object/public/product-images/eclipse-logo.png';

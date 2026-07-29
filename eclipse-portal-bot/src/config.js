// Environment variable validation and constants

// SUPABASE_URL is a fixed public constant for this project, so it's baked in as a
// default below (no need to set it as an env var). Only these two are truly required.
const required = [
  'DISCORD_CUSTOMER_BOT_TOKEN',
  // The bot no longer holds the service_role key (inaccessible on Lovable Cloud);
  // it authenticates to the bot-gateway edge function with this shared secret.
  'BOT_GATEWAY_SECRET',
];

// Project backend URL — public constant; override with SUPABASE_URL only if needed.
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qlnbergwjfrmgkjhrbkj.supabase.co';

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

  // Supabase (URL only — the service_role key is never used by the bot anymore)
  supabaseUrl: SUPABASE_URL,

  // bot-gateway: on Lovable Cloud the service_role key is never exposed, so the
  // bot's privileged DB work goes through the `bot-gateway` edge function, which
  // holds the key server-side. The bot authenticates with this shared secret.
  gatewaySecret: process.env.BOT_GATEWAY_SECRET || '',
  gatewayUrl: `${SUPABASE_URL}/functions/v1/bot-gateway`,

  // Optional
  webhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
  siteUrl: process.env.SITE_URL || 'https://eclipserblx.com',
};

// Branding constants
export const ECLIPSE_COLOR = 0x8b5cf6;
export const ECLIPSE_ICON = 'https://qlnbergwjfrmgkjhrbkj.supabase.co/storage/v1/object/public/product-images/eclipse-logo.png';

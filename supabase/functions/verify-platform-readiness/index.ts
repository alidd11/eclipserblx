// verify-platform-readiness — returns booleans for required server secrets.
// Roadmap probes use this to flip "secret:*" tasks from todo to done.
// Admin-only: exposes which integrations are configured.
import { requireAdmin } from "../_shared/auth-guard.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function present(name: string): boolean {
  const v = Deno.env.get(name);
  return typeof v === 'string' && v.trim().length > 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const _auth = await requireAdmin(req, corsHeaders);
  if ("error" in _auth) return _auth.error;

  const facts = {
    // Stripe
    stripe_secret_key: present('STRIPE_SECRET_KEY'),
    stripe_webhook_secret: present('STRIPE_WEBHOOK_SECRET'),
    stripe_connect_client_id: present('STRIPE_CONNECT_CLIENT_ID'),

    // Email
    resend_api_key: present('RESEND_API_KEY'),

    // Observability
    sentry_dsn: present('SENTRY_DSN') || present('VITE_SENTRY_DSN'),

    // Lovable AI
    lovable_api_key: present('LOVABLE_API_KEY'),

    // Discord
    discord_bot_token: present('DISCORD_BOT_TOKEN'),

    checked_at: new Date().toISOString(),
  };

  return new Response(JSON.stringify(facts), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

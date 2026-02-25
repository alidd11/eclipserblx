import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[WHOIS-ABUSE] ${step}${detailsStr}`);
};

interface LookupRequest {
  domain: string;
  detection_id?: string;
}

interface ComplaintRequest {
  detection_id: string;
  target_url: string;
  original_work_title: string;
  original_work_description: string;
  send_complaint: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    ).auth.getUser(token);

    if (authError || !user) throw new Error("Not authenticated");

    const body = await req.json();
    const action = body.action || 'lookup';

    if (action === 'lookup') {
      return await handleLookup(body as LookupRequest);
    } else if (action === 'file_complaint') {
      return await handleComplaint(body as ComplaintRequest, user, supabaseClient);
    }

    throw new Error("Invalid action");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ─── WHOIS / ABUSE LOOKUP ───

async function handleLookup(body: LookupRequest) {
  const { domain } = body;
  if (!domain) throw new Error("Domain is required");

  // Clean domain
  let cleanDomain = domain;
  try {
    const url = new URL(domain.startsWith('http') ? domain : `https://${domain}`);
    cleanDomain = url.hostname;
  } catch { /* use as-is */ }

  // Remove www prefix
  cleanDomain = cleanDomain.replace(/^www\./, '');

  logStep("Looking up domain", { domain: cleanDomain });

  // Use multiple free WHOIS/DNS lookup APIs
  const [rdapResult, whoIsXml] = await Promise.allSettled([
    fetchRDAP(cleanDomain),
    fetchWhoIsApi(cleanDomain),
  ]);

  let registrar = '';
  let registrarAbuseEmail = '';
  let hostingProvider = '';
  let hostingAbuseEmail = '';
  let nameservers: string[] = [];
  let registrantOrg = '';
  let creationDate = '';

  // Parse RDAP result (official ICANN protocol)
  if (rdapResult.status === 'fulfilled' && rdapResult.value) {
    const rdap = rdapResult.value;
    registrar = rdap.registrar || registrar;
    registrarAbuseEmail = rdap.abuseEmail || registrarAbuseEmail;
    nameservers = rdap.nameservers || nameservers;
    creationDate = rdap.creationDate || creationDate;
    registrantOrg = rdap.registrantOrg || registrantOrg;
  }

  // Parse WHOIS XML result
  if (whoIsXml.status === 'fulfilled' && whoIsXml.value) {
    const whois = whoIsXml.value;
    if (!registrar) registrar = whois.registrar || '';
    if (!registrarAbuseEmail) registrarAbuseEmail = whois.abuseEmail || '';
    if (!hostingProvider) hostingProvider = whois.hostingProvider || '';
    if (!registrantOrg) registrantOrg = whois.registrantOrg || '';
  }

  // Derive hosting provider from nameservers if not found
  if (!hostingProvider && nameservers.length > 0) {
    hostingProvider = deriveHostingProvider(nameservers);
    hostingAbuseEmail = getKnownAbuseEmail(hostingProvider);
  }

  // Fallback: well-known registrar abuse emails
  if (!registrarAbuseEmail && registrar) {
    registrarAbuseEmail = getKnownAbuseEmail(registrar);
  }

  logStep("Lookup complete", { registrar, hostingProvider });

  return new Response(
    JSON.stringify({
      success: true,
      domain: cleanDomain,
      registrar,
      registrar_abuse_email: registrarAbuseEmail,
      hosting_provider: hostingProvider,
      hosting_abuse_email: hostingAbuseEmail,
      nameservers,
      registrant_org: registrantOrg,
      creation_date: creationDate,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ─── FILE COMPLAINT ───

async function handleComplaint(body: ComplaintRequest, user: any, supabaseClient: any) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

  const resend = new Resend(RESEND_API_KEY);

  const { detection_id, target_url, original_work_title, original_work_description, send_complaint } = body;

  // Get user profile
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('display_name, email, username')
    .eq('user_id', user.id)
    .single();

  const creatorName = profile?.display_name || profile?.username || 'IP Shield User';
  const creatorEmail = profile?.email || user.email;

  // Get domain info
  let cleanDomain = '';
  try {
    const url = new URL(target_url.startsWith('http') ? target_url : `https://${target_url}`);
    cleanDomain = url.hostname.replace(/^www\./, '');
  } catch {
    cleanDomain = target_url;
  }

  // Look up abuse contacts
  const [rdapResult] = await Promise.allSettled([fetchRDAP(cleanDomain)]);
  let registrar = '', registrarAbuseEmail = '', hostingProvider = '', hostingAbuseEmail = '';

  if (rdapResult.status === 'fulfilled' && rdapResult.value) {
    registrar = rdapResult.value.registrar || '';
    registrarAbuseEmail = rdapResult.value.abuseEmail || '';
    const ns = rdapResult.value.nameservers || [];
    hostingProvider = deriveHostingProvider(ns);
    hostingAbuseEmail = getKnownAbuseEmail(hostingProvider);
  }

  // Generate DMCA complaint text
  const complaintText = `
DMCA TAKEDOWN NOTICE (17 U.S.C. § 512(c))

To Whom It May Concern,

I am writing to notify you of infringing material hosted on a domain under your management.

CLAIMANT INFORMATION:
Name: Eclipse IP Shield (Agent for ${creatorName})
Email: legal@eclipserblx.com

IDENTIFICATION OF COPYRIGHTED WORK:
Title: ${original_work_title}
Description: ${original_work_description}

IDENTIFICATION OF INFRINGING MATERIAL:
URL: ${target_url}
Domain: ${cleanDomain}

The above URL contains content that infringes upon the copyrighted work described above. The content appears to be an unauthorised reproduction, distribution, or derivative work of the original.

GOOD FAITH STATEMENT:
I have a good faith belief that the use of the copyrighted material described above is not authorised by the copyright owner, its agent, or the law.

ACCURACY STATEMENT:
The information in this notification is accurate, and under penalty of perjury, I am authorised to act on behalf of the owner of an exclusive right that is allegedly infringed.

I request that you immediately remove or disable access to the infringing material described above.

Regards,
Eclipse IP Shield
legal@eclipserblx.com
Agent for ${creatorName}
`.trim();

  const sentToEmails: string[] = [];

  if (send_complaint) {
    // Send to our legal team for forwarding
    const toAddresses = ['legal@eclipserblx.com'];

    const { error: emailError } = await resend.emails.send({
      from: "Eclipse IP Shield <legal@eclipserblx.com>",
      to: toAddresses,
      replyTo: creatorEmail,
      subject: `DMCA Abuse Complaint - ${cleanDomain} - ${original_work_title}`,
      text: `
ABUSE COMPLAINT FOR FORWARDING

Registrar: ${registrar || 'Unknown'}
Registrar Abuse Email: ${registrarAbuseEmail || 'Not found'}
Hosting Provider: ${hostingProvider || 'Unknown'}
Hosting Abuse Email: ${hostingAbuseEmail || 'Not found'}

--- DMCA NOTICE ---

${complaintText}
      `.trim(),
    });

    if (emailError) {
      logStep("Email error", { error: emailError });
      throw new Error("Failed to send complaint email");
    }

    sentToEmails.push('legal@eclipserblx.com');

    // Send confirmation to creator
    await resend.emails.send({
      from: "Eclipse IP Shield <noreply@eclipserblx.com>",
      to: [creatorEmail],
      subject: `Abuse Complaint Filed - ${cleanDomain}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1a2e;">⚖️ Abuse Complaint Filed</h2>
          <p>Hi ${creatorName},</p>
          <p>Your DMCA abuse complaint has been filed through Eclipse IP Shield against:</p>
          <div style="background: #f4f4f8; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Domain:</strong> ${cleanDomain}</p>
            <p style="margin: 4px 0;"><strong>URL:</strong> ${target_url}</p>
            <p style="margin: 4px 0;"><strong>Registrar:</strong> ${registrar || 'Unknown'}</p>
            <p style="margin: 4px 0;"><strong>Hosting:</strong> ${hostingProvider || 'Unknown'}</p>
          </div>
          <p>Our team will review and forward the complaint to the relevant abuse contacts. You'll be notified of any updates.</p>
          <p style="color: #666; font-size: 12px;">Eclipse IP Shield — Protecting your creative work.</p>
        </div>
      `,
    });
  }

  // Save to database
  const { data: complaint, error: dbError } = await supabaseClient
    .from('ip_abuse_complaints')
    .insert({
      creator_id: user.id,
      detection_id: detection_id || null,
      target_domain: cleanDomain,
      target_url,
      registrar_name: registrar || null,
      registrar_abuse_email: registrarAbuseEmail || null,
      hosting_provider: hostingProvider || null,
      hosting_abuse_email: hostingAbuseEmail || null,
      complaint_type: 'dmca',
      complaint_text: complaintText,
      sent_to_emails: sentToEmails,
      sent_at: send_complaint ? new Date().toISOString() : null,
      status: send_complaint ? 'sent' : 'draft',
    })
    .select()
    .single();

  if (dbError) logStep("DB save error", { error: dbError });

  // If detection exists, update its status
  if (detection_id) {
    await supabaseClient
      .from('ip_external_detections')
      .update({ status: 'complaint_filed' })
      .eq('id', detection_id);
  }

  logStep("Complaint filed", { domain: cleanDomain, sent: send_complaint });

  return new Response(
    JSON.stringify({
      success: true,
      complaint_id: complaint?.id,
      complaint_text: complaintText,
      registrar,
      registrar_abuse_email: registrarAbuseEmail,
      hosting_provider: hostingProvider,
      hosting_abuse_email: hostingAbuseEmail,
      sent: send_complaint,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ─── RDAP LOOKUP (ICANN standard) ───

async function fetchRDAP(domain: string) {
  try {
    // Get TLD's RDAP server
    const bootstrapRes = await fetch(`https://rdap.org/domain/${domain}`, {
      headers: { Accept: 'application/rdap+json' },
    });
    if (!bootstrapRes.ok) return null;
    const data = await bootstrapRes.json();

    let registrar = '';
    let abuseEmail = '';
    let nameservers: string[] = [];
    let creationDate = '';
    let registrantOrg = '';

    // Extract registrar from entities
    for (const entity of (data.entities || [])) {
      if (entity.roles?.includes('registrar')) {
        registrar = entity.vcardArray?.[1]?.find((v: any) => v[0] === 'fn')?.[3] || entity.publicIds?.[0]?.identifier || '';
      }
      if (entity.roles?.includes('abuse')) {
        const emailEntry = entity.vcardArray?.[1]?.find((v: any) => v[0] === 'email');
        if (emailEntry) abuseEmail = emailEntry[3];
      }
      // Check nested entities for abuse contact
      for (const sub of (entity.entities || [])) {
        if (sub.roles?.includes('abuse')) {
          const emailEntry = sub.vcardArray?.[1]?.find((v: any) => v[0] === 'email');
          if (emailEntry) abuseEmail = emailEntry[3];
        }
      }
      if (entity.roles?.includes('registrant')) {
        registrantOrg = entity.vcardArray?.[1]?.find((v: any) => v[0] === 'org')?.[3] || '';
      }
    }

    // Extract nameservers
    nameservers = (data.nameservers || []).map((ns: any) => ns.ldhName?.toLowerCase() || '').filter(Boolean);

    // Extract creation date
    for (const event of (data.events || [])) {
      if (event.eventAction === 'registration') {
        creationDate = event.eventDate;
      }
    }

    return { registrar, abuseEmail, nameservers, creationDate, registrantOrg };
  } catch (e) {
    logStep("RDAP lookup failed", { domain, error: String(e) });
    return null;
  }
}

// ─── Free WHOIS API fallback ───

async function fetchWhoIsApi(domain: string) {
  try {
    // Use free ip-api.com for hosting info
    const ipRes = await fetch(`http://ip-api.com/json/${domain}?fields=isp,org,as`);
    if (!ipRes.ok) return null;
    const ipData = await ipRes.json();

    return {
      hostingProvider: ipData.isp || ipData.org || '',
      registrar: '',
      abuseEmail: '',
      registrantOrg: ipData.org || '',
    };
  } catch {
    return null;
  }
}

// ─── HOSTING PROVIDER DETECTION ───

function deriveHostingProvider(nameservers: string[]): string {
  const nsStr = nameservers.join(' ').toLowerCase();
  const providers: Record<string, string> = {
    'cloudflare': 'Cloudflare',
    'awsdns': 'Amazon Web Services (AWS)',
    'amazonaws': 'Amazon Web Services (AWS)',
    'googledomains': 'Google Domains',
    'google': 'Google Cloud',
    'digitalocean': 'DigitalOcean',
    'hostinger': 'Hostinger',
    'namecheap': 'Namecheap',
    'godaddy': 'GoDaddy',
    'ovh': 'OVH',
    'hetzner': 'Hetzner',
    'vultr': 'Vultr',
    'linode': 'Linode',
    'azure': 'Microsoft Azure',
    'vercel': 'Vercel',
    'netlify': 'Netlify',
    'squarespace': 'Squarespace',
    'wix': 'Wix',
    'shopify': 'Shopify',
  };
  for (const [key, name] of Object.entries(providers)) {
    if (nsStr.includes(key)) return name;
  }
  return nameservers[0] ? `Unknown (NS: ${nameservers[0]})` : 'Unknown';
}

// ─── KNOWN ABUSE EMAILS ───

function getKnownAbuseEmail(provider: string): string {
  const pl = provider.toLowerCase();
  const abuseEmails: Record<string, string> = {
    'cloudflare': 'abuse@cloudflare.com',
    'amazon': 'abuse@amazonaws.com',
    'aws': 'abuse@amazonaws.com',
    'google': 'abuse@google.com',
    'digitalocean': 'abuse@digitalocean.com',
    'hostinger': 'abuse@hostinger.com',
    'namecheap': 'abuse@namecheap.com',
    'godaddy': 'abuse@godaddy.com',
    'ovh': 'abuse@ovh.net',
    'hetzner': 'abuse@hetzner.com',
    'vultr': 'abuse@vultr.com',
    'linode': 'abuse@linode.com',
    'microsoft': 'abuse@microsoft.com',
    'azure': 'abuse@microsoft.com',
    'vercel': 'abuse@vercel.com',
    'netlify': 'abuse@netlify.com',
    'squarespace': 'abuse@squarespace.com',
    'wix': 'abuse@wix.com',
    'shopify': 'abuse@shopify.com',
    'porkbun': 'abuse@porkbun.com',
    'tucows': 'domainabuse@tucows.com',
    'enom': 'abuse@enom.com',
    'gandi': 'abuse@gandi.net',
    'dynadot': 'abuse@dynadot.com',
  };
  for (const [key, email] of Object.entries(abuseEmails)) {
    if (pl.includes(key)) return email;
  }
  return '';
}

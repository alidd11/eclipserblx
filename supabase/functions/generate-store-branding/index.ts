import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GenerateBrandingRequest {
  storeId: string;
  storeName: string;
  accentColor: string;
  generateLogo?: boolean;
  generateBanner?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !authData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authData.claims.sub as string;

    // Check if user is admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const isAdmin = roles?.some(r => r.role === "admin" || r.role === "lead_administrator");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting
    const clientIp = getClientIp(req);
    const rateCheck = checkRateLimit({
      ...RATE_LIMITS.EXPENSIVE,
      identifier: `${userId}:${clientIp}`,
      action: "generate-store-branding",
    });

    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck, corsHeaders);
    }

    const body: GenerateBrandingRequest = await req.json();
    const { storeId, storeName, accentColor, generateLogo = true, generateBanner = true } = body;

    if (!storeId || !storeName) {
      return new Response(JSON.stringify({ error: "Store ID and name are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify store exists
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id, name")
      .eq("id", storeId)
      .single();

    if (storeError || !store) {
      return new Response(JSON.stringify({ error: "Store not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { logo?: string; banner?: string } = {};

    // Generate Logo
    if (generateLogo) {
      console.log("Generating logo for store:", storeName);
      const logoPrompt = `Create a minimalist premium logo design. Features a stylized letter "${storeName.charAt(0)}" with elegant wine glass silhouette integration. Uses purple violet gradient tones (${accentColor}). Modern gaming aesthetic with clean vector style. Dark background for contrast. Professional brand mark suitable for a premium Roblox assets marketplace. Square format 200x200. Ultra high resolution.`;

      try {
        const logoResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: logoPrompt }],
            modalities: ["image", "text"],
          }),
        });

        if (!logoResponse.ok) {
          const errorText = await logoResponse.text();
          console.error("Logo generation failed:", logoResponse.status, errorText);
          throw new Error(`Logo generation failed: ${logoResponse.status}`);
        }

        const logoData = await logoResponse.json();
        const logoImage = logoData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        
        if (logoImage) {
          results.logo = logoImage;
          console.log("Logo generated successfully");
        } else {
          console.error("No logo image in response:", JSON.stringify(logoData).slice(0, 500));
        }
      } catch (logoError) {
        console.error("Logo generation error:", logoError);
      }
    }

    // Generate Banner
    if (generateBanner) {
      console.log("Generating banner for store:", storeName);
      const bannerPrompt = `Create a wide banner design 1200x400 aspect ratio. Abstract flowing purple violet gradient background (${accentColor}). Subtle geometric patterns and tech elements like faint grid lines or code fragments. Premium luxurious feel with depth and dimension. Modern tech aesthetic suitable for a gaming marketplace header. Dark theme. No text at all. 16:9 aspect ratio. Ultra high resolution.`;

      try {
        const bannerResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: bannerPrompt }],
            modalities: ["image", "text"],
          }),
        });

        if (!bannerResponse.ok) {
          const errorText = await bannerResponse.text();
          console.error("Banner generation failed:", bannerResponse.status, errorText);
          throw new Error(`Banner generation failed: ${bannerResponse.status}`);
        }

        const bannerData = await bannerResponse.json();
        const bannerImage = bannerData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        
        if (bannerImage) {
          results.banner = bannerImage;
          console.log("Banner generated successfully");
        } else {
          console.error("No banner image in response:", JSON.stringify(bannerData).slice(0, 500));
        }
      } catch (bannerError) {
        console.error("Banner generation error:", bannerError);
      }
    }

    if (!results.logo && !results.banner) {
      return new Response(JSON.stringify({ error: "Failed to generate any images" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Branding generation complete. Logo:", !!results.logo, "Banner:", !!results.banner);

    return new Response(JSON.stringify({ success: true, images: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-store-branding error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

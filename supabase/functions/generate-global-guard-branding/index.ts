import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
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

    const body = await req.json().catch(() => ({}));
    const { generateLogo = true, generateBanner = true } = body;

    const results: { logo?: string; banner?: string } = {};

    // Generate Logo - Shield with "G" design
    if (generateLogo) {
      console.log("Generating Global Guard logo...");
      const logoPrompt = `Create a minimalist premium logo design for "Global Guard" security service. Features a stylized shield icon with the letter "G" integrated into it. Uses a deep blue to purple gradient (from #1e40af to #7c3aed). Modern clean vector style with subtle protective elements like geometric patterns within the shield. Dark background (#0a0a0f) for contrast. Professional brand mark suitable for a security/protection service. Square format 512x512. Ultra high resolution.`;

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
          console.log("Global Guard logo generated successfully");
        } else {
          console.error("No logo image in response:", JSON.stringify(logoData).slice(0, 500));
        }
      } catch (logoError) {
        console.error("Logo generation error:", logoError);
      }
    }

    // Generate Banner - Wide security-themed design
    if (generateBanner) {
      console.log("Generating Global Guard banner...");
      const bannerPrompt = `Create a wide banner design 1200x400 aspect ratio for "Global Guard" security platform. Abstract flowing gradient background transitioning from deep blue (#1e40af) through violet (#7c3aed) to purple (#9333ea). Incorporate subtle shield silhouettes, geometric security patterns, and faint grid lines suggesting protection and surveillance. Premium luxurious feel with depth and dimension. Modern tech aesthetic with subtle glow effects. Dark theme (#0a0a0f base). No text at all. 3:1 aspect ratio. Ultra high resolution.`;

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
          console.log("Global Guard banner generated successfully");
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

    // Upload to storage if we have a service role key
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (serviceRoleKey) {
      const adminSupabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        serviceRoleKey
      );

      const uploadPromises: Promise<void>[] = [];

      if (results.logo) {
        uploadPromises.push(
          (async () => {
            try {
              const base64Data = results.logo!.replace(/^data:image\/\w+;base64,/, "");
              const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
              
              const { error: uploadError } = await adminSupabase.storage
                .from("store-branding")
                .upload("global-guard/logo.png", binaryData, {
                  contentType: "image/png",
                  upsert: true,
                });

              if (uploadError) {
                console.error("Logo upload error:", uploadError);
              } else {
                console.log("Logo uploaded to storage");
              }
            } catch (e) {
              console.error("Logo upload failed:", e);
            }
          })()
        );
      }

      if (results.banner) {
        uploadPromises.push(
          (async () => {
            try {
              const base64Data = results.banner!.replace(/^data:image\/\w+;base64,/, "");
              const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
              
              const { error: uploadError } = await adminSupabase.storage
                .from("store-branding")
                .upload("global-guard/banner.png", binaryData, {
                  contentType: "image/png",
                  upsert: true,
                });

              if (uploadError) {
                console.error("Banner upload error:", uploadError);
              } else {
                console.log("Banner uploaded to storage");
              }
            } catch (e) {
              console.error("Banner upload failed:", e);
            }
          })()
        );
      }

      await Promise.all(uploadPromises);
    }

    console.log("Global Guard branding generation complete. Logo:", !!results.logo, "Banner:", !!results.banner);

    return new Response(JSON.stringify({ success: true, images: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-global-guard-branding error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

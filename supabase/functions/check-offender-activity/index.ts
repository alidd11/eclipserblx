import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-OFFENDER] ${step}${detailsStr}`);
};

// ─── SIMILARITY HELPERS ───
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function nameSimilarity(a: string, b: string): number {
  const ca = a.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const cb = b.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  if (!ca || !cb) return 0;
  if (ca === cb) return 100;
  const maxLen = Math.max(ca.length, cb.length);
  const dist = levenshtein(ca, cb);
  return Math.round(Math.max(0, (1 - dist / maxLen) * 100));
}

function tokenOverlap(a: string, b: string): number {
  const ta = new Set(a.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2));
  const tb = new Set(b.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2));
  if (ta.size === 0 || tb.size === 0) return 0;
  let overlap = 0;
  for (const t of ta) if (tb.has(t)) overlap++;
  const union = new Set([...ta, ...tb]).size;
  return Math.round((overlap / union) * 100);
}

// ─── ROBLOX API HELPERS ───
async function fetchUserCreations(robloxUserId: string): Promise<{ universeId: string; name: string; created: string; updated: string; description: string }[]> {
  const creations: { universeId: string; name: string; created: string; updated: string; description: string }[] = [];
  
  try {
    // Fetch user's games
    const res = await fetch(
      `https://games.roblox.com/v2/users/${robloxUserId}/games?accessFilter=Public&limit=50&sortOrder=Desc`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) {
      logStep("Failed to fetch user games", { status: res.status });
      return creations;
    }
    const data = await res.json();
    for (const game of (data.data || [])) {
      creations.push({
        universeId: String(game.id),
        name: game.name || "Unknown",
        created: game.created || "",
        updated: game.updated || "",
        description: game.description || "",
      });
    }
  } catch (err) {
    logStep("Error fetching user creations", { error: String(err) });
  }

  return creations;
}

async function fetchGroupCreations(groupId: string): Promise<{ universeId: string; name: string; created: string; updated: string; description: string }[]> {
  const creations: { universeId: string; name: string; created: string; updated: string; description: string }[] = [];
  
  try {
    const res = await fetch(
      `https://games.roblox.com/v2/groups/${groupId}/games?accessFilter=Public&limit=50&sortOrder=Desc`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return creations;
    const data = await res.json();
    for (const game of (data.data || [])) {
      creations.push({
        universeId: String(game.id),
        name: game.name || "Unknown",
        created: game.created || "",
        updated: game.updated || "",
        description: game.description || "",
      });
    }
  } catch (err) {
    logStep("Error fetching group creations", { error: String(err) });
  }

  return creations;
}

async function fetchGameThumbnail(universeId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0]?.imageUrl || null;
  } catch {
    return null;
  }
}

async function fetchRobloxUsername(robloxUserId: string): Promise<string | null> {
  try {
    const res = await fetch(`https://users.roblox.com/v1/users/${robloxUserId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.name || null;
  } catch {
    return null;
  }
}

async function fetchGroupName(groupId: string): Promise<string | null> {
  try {
    const res = await fetch(`https://groups.roblox.com/v1/groups/${groupId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.name || null;
  } catch {
    return null;
  }
}

async function fetchRootPlaceId(universeId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://games.roblox.com/v1/games?universeIds=${universeId}`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0]?.rootPlaceId ? String(data.data[0].rootPlaceId) : null;
  } catch {
    return null;
  }
}

// Extract Roblox creator ID from a universe's details
async function extractCreatorFromUniverse(universeId: string): Promise<{ creatorId: string; creatorType: string } | null> {
  try {
    const res = await fetch(
      `https://games.roblox.com/v1/games?universeIds=${universeId}`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const game = data.data?.[0];
    if (!game?.creator) return null;
    return {
      creatorId: String(game.creator.id),
      creatorType: game.creator.type || "User",
    };
  } catch {
    return null;
  }
}

// Extract universe ID from various Roblox URL formats
function extractUniverseOrPlaceId(url: string): { type: 'universe' | 'place' | 'unknown'; id: string } | null {
  // https://www.roblox.com/games/12345/Game-Name
  const placeMatch = url.match(/roblox\.com\/games\/(\d+)/);
  if (placeMatch) return { type: 'place', id: placeMatch[1] };
  
  // Direct universe ID
  const universeMatch = url.match(/universeId[=:](\d+)/i);
  if (universeMatch) return { type: 'universe', id: universeMatch[1] };
  
  // Just a number
  const numMatch = url.match(/^(\d+)$/);
  if (numMatch) return { type: 'unknown', id: numMatch[1] };
  
  return null;
}

async function resolveToUniverseId(placeId: string): Promise<string | null> {
  try {
    const res = await fetch(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.universeId ? String(data.universeId) : null;
  } catch {
    return null;
  }
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

    const { takedown_id } = await req.json();
    if (!takedown_id) throw new Error("takedown_id is required");

    logStep("Starting offender activity check", { takedown_id });

    // Fetch takedown details
    const { data: takedown, error: fetchError } = await supabaseClient
      .from("takedown_requests")
      .select("*")
      .eq("id", takedown_id)
      .single();

    if (fetchError || !takedown) throw new Error("Takedown request not found");

    // Determine offender's Roblox ID
    let offenderRobloxId = takedown.offender_roblox_id;
    let offenderType = "User";

    // If no offender ID stored, try to extract from the infringing URL
    if (!offenderRobloxId && takedown.infringing_url) {
      logStep("Extracting offender from infringing URL", { url: takedown.infringing_url });
      
      const parsed = extractUniverseOrPlaceId(takedown.infringing_url);
      if (parsed) {
        let universeId = parsed.id;
        if (parsed.type === 'place') {
          const resolved = await resolveToUniverseId(parsed.id);
          if (resolved) universeId = resolved;
        }
        
        const creator = await extractCreatorFromUniverse(universeId);
        if (creator) {
          offenderRobloxId = creator.creatorId;
          offenderType = creator.creatorType;
          
          // Get display name
          const displayName = offenderType === "Group" 
            ? await fetchGroupName(offenderRobloxId) 
            : await fetchRobloxUsername(offenderRobloxId);
          
          // Save to DB for future checks
          await supabaseClient
            .from("takedown_requests")
            .update({
              offender_roblox_id: offenderRobloxId,
              offender_roblox_username: displayName || `${offenderType}:${offenderRobloxId}`,
            })
            .eq("id", takedown_id);
          
          logStep("Resolved offender", { offenderRobloxId, offenderType, username });
        }
      }
    }

    if (!offenderRobloxId) {
      throw new Error("Could not determine offender's Roblox ID. Please add the offender's Roblox user ID to the takedown case.");
    }

    // Fetch offender's current creations
    logStep("Fetching offender creations", { offenderRobloxId, offenderType });
    
    let creations;
    if (offenderType === "Group") {
      creations = await fetchGroupCreations(offenderRobloxId);
    } else {
      creations = await fetchUserCreations(offenderRobloxId);
    }

    logStep("Found creations", { count: creations.length });

    // Get original work info for comparison
    const originalTitle = takedown.original_work_description || "";
    const originalUrl = takedown.infringing_url || "";
    
    // Extract the original infringing universe ID to exclude it
    let originalUniverseId: string | null = null;
    const parsedOriginal = extractUniverseOrPlaceId(originalUrl);
    if (parsedOriginal) {
      if (parsedOriginal.type === 'place') {
        originalUniverseId = await resolveToUniverseId(parsedOriginal.id);
      } else {
        originalUniverseId = parsedOriginal.id;
      }
    }

    // Compare each creation against the original work
    const suspiciousFinds: {
      universeId: string;
      name: string;
      created: string;
      updated: string;
      nameSimilarity: number;
      descriptionSimilarity: number;
      overallScore: number;
      thumbnailUrl: string | null;
      gameUrl: string;
      isNew: boolean;
    }[] = [];

    for (const creation of creations) {
      // Skip the original infringing game
      if (creation.universeId === originalUniverseId) continue;

      const nameScore = nameSimilarity(creation.name, originalTitle);
      const descScore = tokenOverlap(creation.description, originalTitle);
      
      // Weighted overall score
      const overallScore = Math.round(nameScore * 0.6 + descScore * 0.4);
      
      // Check if this was created/updated after the takedown
      const isNew = takedown.dmca_sent_at 
        ? new Date(creation.updated || creation.created) > new Date(takedown.dmca_sent_at)
        : false;

      // Flag if similarity is meaningful (≥25%) or if it's new activity
      if (overallScore >= 25 || (isNew && overallScore >= 15)) {
        // Fetch thumbnail and root place ID in parallel for valid Roblox links
        const [thumbnail, rootPlaceId] = await Promise.all([
          fetchGameThumbnail(creation.universeId),
          fetchRootPlaceId(creation.universeId),
        ]);
        const linkId = rootPlaceId || creation.universeId;
        suspiciousFinds.push({
          universeId: creation.universeId,
          name: creation.name,
          created: creation.created,
          updated: creation.updated,
          nameSimilarity: nameScore,
          descriptionSimilarity: descScore,
          overallScore,
          thumbnailUrl: thumbnail,
          gameUrl: `https://www.roblox.com/games/${linkId}`,
          isNew,
        });
      }
    }

    // Sort by score descending
    suspiciousFinds.sort((a, b) => b.overallScore - a.overallScore);

    // Update takedown record
    await supabaseClient
      .from("takedown_requests")
      .update({
        last_recheck_at: new Date().toISOString(),
        recheck_count: (takedown.recheck_count || 0) + 1,
        recheck_results: {
          checked_at: new Date().toISOString(),
          total_creations: creations.length,
          suspicious_count: suspiciousFinds.length,
          findings: suspiciousFinds.slice(0, 20), // Store top 20
        },
      })
      .eq("id", takedown_id);

    logStep("Offender check complete", { 
      total_creations: creations.length, 
      suspicious: suspiciousFinds.length 
    });

    return new Response(
      JSON.stringify({
        success: true,
        offender_roblox_id: offenderRobloxId,
        total_creations: creations.length,
        suspicious_count: suspiciousFinds.length,
        findings: suspiciousFinds.slice(0, 20),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

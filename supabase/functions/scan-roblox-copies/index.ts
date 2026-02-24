import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SCAN-ROBLOX-COPIES] ${step}${detailsStr}`);
};

interface SearchResult {
  universeId: string;
  placeId?: string;
  name: string;
  creatorName: string;
  creatorId: string;
  creatorType: string;
  playerCount: number;
  totalUpVotes?: number;
  totalDownVotes?: number;
}

// Search Roblox for games matching a keyword
async function searchRobloxGames(keyword: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  try {
    // Use the Roblox games search API
    const searchUrl = `https://games.roblox.com/v1/games/list?model.keyword=${encodeURIComponent(keyword)}&model.startRows=0&model.maxRows=25&model.sortToken=`;
    const res = await fetch(searchUrl, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      logStep("Games list API failed, trying omni-search", { status: res.status });
      // Fallback: try the omni-search endpoint
      return await searchRobloxOmni(keyword);
    }

    const data = await res.json();
    if (data.games && Array.isArray(data.games)) {
      for (const game of data.games) {
        results.push({
          universeId: String(game.universeId),
          placeId: game.placeId ? String(game.placeId) : undefined,
          name: game.name || "Unknown",
          creatorName: game.creatorName || "Unknown",
          creatorId: String(game.creatorId || ""),
          creatorType: game.creatorType || "User",
          playerCount: game.playerCount || 0,
          totalUpVotes: game.totalUpVotes,
          totalDownVotes: game.totalDownVotes,
        });
      }
    }
  } catch (err) {
    logStep("Search error, trying omni-search fallback", { error: String(err) });
    return await searchRobloxOmni(keyword);
  }

  return results;
}

// Fallback: Roblox omni-search
async function searchRobloxOmni(keyword: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  try {
    const url = `https://apis.roblox.com/search-api/omni-search?searchQuery=${encodeURIComponent(keyword)}&pageType=games`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      logStep("Omni-search also failed", { status: res.status });
      return results;
    }

    const data = await res.json();
    // Parse omni-search response structure
    const searchResults = data?.searchResults || [];
    for (const section of searchResults) {
      const contents = section?.contents || [];
      for (const item of contents) {
        if (item.contentType === "Game" && item.universeId) {
          results.push({
            universeId: String(item.universeId),
            placeId: item.rootPlaceId ? String(item.rootPlaceId) : undefined,
            name: item.name || "Unknown",
            creatorName: item.creatorName || "Unknown",
            creatorId: String(item.creatorId || ""),
            creatorType: item.creatorType || "User",
            playerCount: item.playerCount || 0,
          });
        }
      }
    }
  } catch (err) {
    logStep("Omni-search error", { error: String(err) });
  }

  return results;
}

// Get universe details for creator verification
async function getUniverseCreator(universeId: string) {
  try {
    const res = await fetch(
      `https://games.roblox.com/v1/games?universeIds=${universeId}`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const game = data.data?.[0];
    if (!game) return null;
    return {
      creatorId: String(game.creator?.id),
      creatorName: game.creator?.name || "Unknown",
      creatorType: game.creator?.type || "User",
    };
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  logStep("Copy detection scan started");

  try {
    // Get all registry entries 
    const { data: registryEntries, error: registryError } = await supabaseClient
      .from("creator_ip_registry")
      .select("id, creator_id, title, search_keywords")
      .not("creator_id", "is", null);

    if (registryError) {
      throw new Error(`Failed to fetch registry: ${registryError.message}`);
    }

    if (!registryEntries || registryEntries.length === 0) {
      logStep("No registry entries found");
      return new Response(JSON.stringify({ message: "No entries to scan", total_detected: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get creator profiles with Roblox IDs
    const creatorIds = [...new Set(registryEntries.map(e => e.creator_id))];
    const { data: profiles } = await supabaseClient
      .from("profiles")
      .select("user_id, roblox_user_id")
      .in("user_id", creatorIds);

    const profileMap = new Map(
      (profiles || []).map(p => [p.user_id, p])
    );

    let totalSearches = 0;
    let totalDetected = 0;

    for (const entry of registryEntries) {
      const creatorProfile = profileMap.get(entry.creator_id);
      const creatorRobloxId = creatorProfile?.roblox_user_id;

      // Build keyword list: title + custom keywords
      const keywords: string[] = [];
      
      // Always use the title
      if (entry.title) {
        keywords.push(entry.title);
      }

      // Add custom search keywords
      if (entry.search_keywords && Array.isArray(entry.search_keywords)) {
        for (const kw of entry.search_keywords) {
          if (kw && !keywords.includes(kw)) {
            keywords.push(kw);
          }
        }
      }

      if (keywords.length === 0) continue;

      logStep("Scanning entry", { entryId: entry.id, keywords });

      for (const keyword of keywords) {
        totalSearches++;
        // Rate limit between searches
        if (totalSearches > 1) await new Promise(r => setTimeout(r, 1000));

        const searchResults = await searchRobloxGames(keyword);
        logStep("Search results", { keyword, count: searchResults.length });

        for (const result of searchResults) {
          // Skip if this is the creator's own game
          if (creatorRobloxId && result.creatorId === creatorRobloxId) {
            continue;
          }

          // Verify creator info if not in search results
          let creatorName = result.creatorName;
          let creatorId = result.creatorId;
          let creatorType = result.creatorType;

          if (!creatorId) {
            const universeCreator = await getUniverseCreator(result.universeId);
            if (universeCreator) {
              creatorId = universeCreator.creatorId;
              creatorName = universeCreator.creatorName;
              creatorType = universeCreator.creatorType;

              // Skip if it's the creator's own game
              if (creatorRobloxId && creatorId === creatorRobloxId) {
                continue;
              }
            }
          }

          // Upsert detection (ignore duplicates)
          const { error: insertError } = await supabaseClient
            .from("ip_copy_detections")
            .upsert({
              registry_entry_id: entry.id,
              creator_id: entry.creator_id,
              search_keyword: keyword,
              detected_universe_id: result.universeId,
              detected_place_id: result.placeId || null,
              game_name: result.name,
              game_creator_name: creatorName,
              game_creator_id: creatorId,
              game_creator_type: creatorType,
              player_count: result.playerCount,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: "registry_entry_id,detected_universe_id",
              ignoreDuplicates: false,
            });

          if (insertError) {
            logStep("Insert error", { error: insertError.message });
          } else {
            totalDetected++;
          }
        }
      }
    }

    logStep("Scan complete", { totalSearches, totalDetected });

    return new Response(
      JSON.stringify({
        success: true,
        total_searches: totalSearches,
        total_detected: totalDetected,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("SCAN ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

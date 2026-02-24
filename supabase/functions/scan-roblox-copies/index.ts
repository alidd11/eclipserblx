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
  description?: string;
  creatorName: string;
  creatorId: string;
  creatorType: string;
  playerCount: number;
}

// ─── KEYWORD VARIANT GENERATION ───
function generateKeywordVariants(keyword: string): string[] {
  const variants = new Set<string>();
  variants.add(keyword);

  const noSpecial = keyword.replace(/[^a-zA-Z0-9\s]/g, '');
  if (noSpecial !== keyword) variants.add(noSpecial);

  const spaced = keyword.replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (spaced !== keyword) variants.add(spaced);

  const words = spaced.split(' ').filter(w => w.length >= 3);
  
  // Always add individual significant words as standalone searches
  for (const w of words) {
    if (w.length >= 4) variants.add(w);
  }

  if (words.length >= 2) {
    variants.add(`${words[0]} ${words[words.length - 1]}`);
  }

  const withoutRP = spaced.replace(/\b(RP|Roleplay|Role Play)\b/gi, '').replace(/\s+/g, ' ').trim();
  if (withoutRP.length >= 3 && withoutRP !== spaced) variants.add(withoutRP);

  if (!/\bRP\b/i.test(keyword) && words.length <= 3) {
    variants.add(`${keyword} RP`);
  }

  // Also add the keyword without short words (articles, prepositions)
  const significantWords = words.filter(w => w.length >= 4);
  if (significantWords.length >= 1 && significantWords.join(' ') !== spaced) {
    variants.add(significantWords.join(' '));
  }

  return [...variants].slice(0, 12);
}

// ─── ROBLOX SEARCH: OMNI-SEARCH API ───
async function searchOmniAPI(keyword: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const sessionId = crypto.randomUUID().replace(/-/g, '');
  
  try {
    const url = `https://apis.roblox.com/search-api/omni-search?searchQuery=${encodeURIComponent(keyword)}&sessionId=${sessionId}&pageType=all`;
    logStep("Omni-search request", { url: url.substring(0, 120) });
    const res = await fetch(url, { 
      headers: { 
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      } 
    });
    if (!res.ok) {
      const body = await res.text();
      logStep("Omni-search failed", { status: res.status, body: body.substring(0, 200) });
      return results;
    }

    const data = await res.json();
    logStep("Omni-search raw response keys", { keys: Object.keys(data), resultsCount: data?.searchResults?.length });
    
    for (const section of (data?.searchResults || [])) {
      for (const item of (section?.contents || [])) {
        if (item.contentType === "Game" && item.universeId) {
          results.push({
            universeId: String(item.universeId),
            placeId: item.rootPlaceId ? String(item.rootPlaceId) : undefined,
            name: item.name || "Unknown",
            description: item.description || undefined,
            creatorName: item.creatorName || "Unknown",
            creatorId: String(item.creatorId || ""),
            creatorType: item.creatorType || "User",
            playerCount: item.playerCount || 0,
          });
        }
      }
    }
    
    // If pageType=all didn't work, try pageType=experiences
    if (results.length === 0) {
      const url2 = `https://apis.roblox.com/search-api/omni-search?searchQuery=${encodeURIComponent(keyword)}&sessionId=${sessionId}&pageType=experiences`;
      const res2 = await fetch(url2, { 
        headers: { 
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        } 
      });
      if (res2.ok) {
        const data2 = await res2.json();
        for (const section of (data2?.searchResults || [])) {
          for (const item of (section?.contents || [])) {
            if (item.contentType === "Game" && item.universeId) {
              results.push({
                universeId: String(item.universeId),
                placeId: item.rootPlaceId ? String(item.rootPlaceId) : undefined,
                name: item.name || "Unknown",
                description: item.description || undefined,
                creatorName: item.creatorName || "Unknown",
                creatorId: String(item.creatorId || ""),
                creatorType: item.creatorType || "User",
                playerCount: item.playerCount || 0,
              });
            }
          }
        }
      }
    }
  } catch (err) {
    logStep("Omni-search error", { error: String(err) });
  }
  return results;
}

// ─── FETCH GAME DETAILS (for creator info & player count) ───
async function fetchGameDetails(universeIds: string[]): Promise<Map<string, { creatorName: string; creatorId: string; creatorType: string; playerCount: number; description: string | null }>> {
  const details = new Map<string, { creatorName: string; creatorId: string; creatorType: string; playerCount: number; description: string | null }>();
  
  // Batch fetch in groups of 50
  for (let i = 0; i < universeIds.length; i += 50) {
    const batch = universeIds.slice(i, i + 50);
    try {
      const res = await fetch(
        `https://games.roblox.com/v1/games?universeIds=${batch.join(',')}`,
        { headers: { Accept: "application/json" } }
      );
      if (!res.ok) continue;
      const data = await res.json();
      for (const game of (data.data || [])) {
        details.set(String(game.id), {
          creatorName: game.creator?.name || "Unknown",
          creatorId: String(game.creator?.id || ""),
          creatorType: game.creator?.type || "Unknown",
          playerCount: game.playing || 0,
          description: game.description || null,
        });
      }
      if (i + 50 < universeIds.length) await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      logStep("Game details fetch error", { error: String(err) });
    }
  }
  return details;
}

// ─── COMBINED SEARCH ───
async function searchRobloxCombined(keyword: string): Promise<SearchResult[]> {
  const results = await searchOmniAPI(keyword);
  
  // If omni-search returned results without full creator info, enrich them
  const needsEnrichment = results.filter(r => r.creatorId === "" || r.creatorName === "Unknown");
  if (needsEnrichment.length > 0) {
    const universeIds = needsEnrichment.map(r => r.universeId);
    const details = await fetchGameDetails(universeIds);
    
    for (const result of needsEnrichment) {
      const detail = details.get(result.universeId);
      if (detail) {
        result.creatorName = detail.creatorName;
        result.creatorId = detail.creatorId;
        result.creatorType = detail.creatorType;
        result.playerCount = detail.playerCount;
        if (!result.description && detail.description) {
          result.description = detail.description;
        }
      }
    }
  }
  
  return results;
}

// ─── FETCH GAME DESCRIPTION ───
async function fetchGameDescription(universeId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://games.roblox.com/v1/games?universeIds=${universeId}`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0]?.description || null;
  } catch {
    return null;
  }
}

// ─── FETCH GAME THUMBNAIL ───
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

// ─── FETCH CREATOR GROUP INFO ───
async function fetchCreatorGroupInfo(creatorId: string, creatorType: string): Promise<{ groupId: string; groupName: string } | null> {
  if (creatorType !== 'Group') return null;
  try {
    const res = await fetch(
      `https://groups.roblox.com/v1/groups/${creatorId}`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return { groupId: String(data.id), groupName: data.name || "Unknown Group" };
  } catch {
    return null;
  }
}

// ─── CHECK IF CREATOR OWNS GROUP ───
async function isUserInGroup(robloxUserId: string, groupId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://groups.roblox.com/v1/users/${robloxUserId}/groups/roles`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return false;
    const data = await res.json();
    return (data.data || []).some((g: any) => String(g.group?.id) === groupId);
  } catch {
    return false;
  }
}

// ─── SIMILARITY SCORING ───
function computeNameSimilarity(original: string, candidate: string): number {
  const a = original.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const b = candidate.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

  if (a === b) return 100;
  if (b.includes(a) || a.includes(b)) return 85;

  const wordsA = new Set(a.split(/\s+/).filter(w => w.length >= 2));
  const wordsB = new Set(b.split(/\s+/).filter(w => w.length >= 2));
  const intersection = [...wordsA].filter(w => wordsB.has(w));
  const union = new Set([...wordsA, ...wordsB]);

  if (union.size === 0) return 0;
  return Math.round((intersection.length / union.size) * 100);
}

function checkDescriptionMatch(description: string, keywords: string[]): boolean {
  const descLower = description.toLowerCase();
  const suspiciousPhrases = [
    'better version', 'improved version', 'remake of', 'inspired by',
    'based on', 'like', 'similar to', 'copy of', 'clone of',
  ];

  for (const kw of keywords) {
    const kwLower = kw.toLowerCase();
    if (kwLower.length >= 4 && descLower.includes(kwLower)) return true;
  }

  for (const phrase of suspiciousPhrases) {
    if (descLower.includes(phrase)) return true;
  }

  return false;
}

// ─── AI THUMBNAIL COMPARISON ───
async function compareThumbnailsAI(
  originalThumbUrl: string,
  candidateThumbUrl: string,
  originalTitle: string,
  candidateTitle: string
): Promise<{ isSimilar: boolean; confidence: number; reasoning: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return { isSimilar: false, confidence: 0, reasoning: "No AI key available" };
  }

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are an IP infringement detection system for Roblox games. Compare these two game thumbnails and determine if the second game appears to be a copy, clone, or stolen version of the first.

Original game: "${originalTitle}"
Candidate game: "${candidateTitle}"

Consider:
- Visual similarity of the thumbnail art style, layout, colors
- Similar logos, text, branding
- Reused assets or near-identical compositions
- Different but clearly derivative artwork

Respond with ONLY a JSON object (no markdown):
{"is_similar": true/false, "confidence": 0-100, "reasoning": "brief explanation"}`,
              },
              { type: "image_url", image_url: { url: originalThumbUrl } },
              { type: "image_url", image_url: { url: candidateThumbUrl } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      logStep("AI comparison failed", { status: response.status });
      return { isSimilar: false, confidence: 0, reasoning: "AI API error" };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        isSimilar: parsed.is_similar === true,
        confidence: parsed.confidence || 0,
        reasoning: parsed.reasoning || "",
      };
    }

    return { isSimilar: false, confidence: 0, reasoning: "Could not parse AI response" };
  } catch (err) {
    logStep("AI comparison error", { error: String(err) });
    return { isSimilar: false, confidence: 0, reasoning: String(err) };
  }
}

// ─── MAIN HANDLER ───
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  logStep("Enhanced copy detection scan started");

  try {
    const { data: registryEntries, error: registryError } = await supabaseClient
      .from("creator_ip_registry")
      .select("id, creator_id, title, search_keywords, roblox_universe_ids")
      .not("creator_id", "is", null);

    if (registryError) throw new Error(`Failed to fetch registry: ${registryError.message}`);

    if (!registryEntries || registryEntries.length === 0) {
      logStep("No registry entries found");
      return new Response(JSON.stringify({ message: "No entries to scan", total_detected: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const creatorIds = [...new Set(registryEntries.map(e => e.creator_id))];
    const { data: profiles } = await supabaseClient
      .from("profiles")
      .select("user_id, roblox_user_id")
      .in("user_id", creatorIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    let totalSearches = 0;
    let totalDetected = 0;
    let thumbnailsAnalyzed = 0;
    let groupsVerified = 0;
    let snapshotsCreated = 0;

    for (const entry of registryEntries) {
      const creatorProfile = profileMap.get(entry.creator_id);
      const creatorRobloxId = creatorProfile?.roblox_user_id;

      // Build base keywords
      const baseKeywords: string[] = [];
      if (entry.title) baseKeywords.push(entry.title);
      if (entry.search_keywords && Array.isArray(entry.search_keywords)) {
        for (const kw of entry.search_keywords) {
          if (kw && !baseKeywords.includes(kw)) baseKeywords.push(kw);
        }
      }
      if (baseKeywords.length === 0) continue;

      // Generate variants
      const allVariants = new Set<string>();
      for (const kw of baseKeywords) {
        for (const v of generateKeywordVariants(kw)) {
          allVariants.add(v);
        }
      }

      const keywords = [...allVariants];
      logStep("Scanning entry with variants", { entryId: entry.id, baseKeywords, totalVariants: keywords.length });

      const ownUniverseIds = new Set(
        (entry.roblox_universe_ids || []).map(String)
      );

      // Fetch original game thumbnail for AI comparison
      let originalThumbUrl: string | null = null;
      if (ownUniverseIds.size > 0) {
        const firstUniverse = [...ownUniverseIds][0];
        originalThumbUrl = await fetchGameThumbnail(firstUniverse);
      }

      // Deduplicate results across all keyword variants
      const allResults = new Map<string, { result: SearchResult; matchedKeyword: string }>();

      for (const keyword of keywords) {
        totalSearches++;
        if (totalSearches > 1) await new Promise(r => setTimeout(r, 800));

        const searchResults = await searchRobloxCombined(keyword);
        logStep("Search results", { keyword, count: searchResults.length });

        for (const result of searchResults) {
          if (creatorRobloxId && result.creatorId === creatorRobloxId) continue;
          if (ownUniverseIds.has(result.universeId)) continue;

          if (!allResults.has(result.universeId)) {
            allResults.set(result.universeId, { result, matchedKeyword: keyword });
          }
        }
      }

      logStep("Unique results to process", { count: allResults.size });

      // Fetch existing detections for this entry to track history
      const { data: existingDetections } = await supabaseClient
        .from("ip_copy_detections")
        .select("id, detected_universe_id, player_count, similarity_score")
        .eq("registry_entry_id", entry.id);

      const existingMap = new Map(
        (existingDetections || []).map((d: any) => [d.detected_universe_id, d])
      );

      // Process each unique result
      for (const [universeId, { result, matchedKeyword }] of allResults) {
        const matchReasons: string[] = [];
        let score = 0;

        // 1. Name similarity scoring
        const nameSim = computeNameSimilarity(entry.title, result.name);
        if (nameSim >= 50) {
          matchReasons.push(`name_match_${nameSim}%`);
          score += nameSim;
        } else if (nameSim >= 30) {
          matchReasons.push(`partial_name_${nameSim}%`);
          score += nameSim / 2;
        }

        // 2. Description matching
        let description = result.description || null;
        if (!description) {
          description = await fetchGameDescription(universeId);
          await new Promise(r => setTimeout(r, 200));
        }

        if (description && checkDescriptionMatch(description, baseKeywords)) {
          matchReasons.push("description_match");
          score += 30;
        }

        // 3. Creator group/owner verification
        let creatorVerified = false;
        let creatorGroupId: string | null = null;
        let creatorGroupName: string | null = null;

        if (result.creatorType === 'Group' && creatorRobloxId && groupsVerified < 20) {
          const groupInfo = await fetchCreatorGroupInfo(result.creatorId, result.creatorType);
          if (groupInfo) {
            creatorGroupId = groupInfo.groupId;
            creatorGroupName = groupInfo.groupName;
            
            // Check if original creator is a member of this group
            const isMember = await isUserInGroup(creatorRobloxId, groupInfo.groupId);
            if (isMember) {
              // This is likely the creator's own group - skip or reduce score
              creatorVerified = true;
              matchReasons.push("creator_owns_group");
              score = Math.max(0, score - 50); // Significantly reduce score
            }
            groupsVerified++;
            await new Promise(r => setTimeout(r, 300));
          }
        } else if (creatorRobloxId && result.creatorId === creatorRobloxId) {
          creatorVerified = true;
        }

        // 4. AI Thumbnail comparison
        let thumbnailAnalyzed = false;
        if (originalThumbUrl && score >= 20 && thumbnailsAnalyzed < 10 && !creatorVerified) {
          const candidateThumb = await fetchGameThumbnail(universeId);
          if (candidateThumb) {
            await new Promise(r => setTimeout(r, 500));
            const aiResult = await compareThumbnailsAI(
              originalThumbUrl, candidateThumb, entry.title, result.name
            );
            thumbnailsAnalyzed++;
            thumbnailAnalyzed = true;

            if (aiResult.isSimilar) {
              matchReasons.push(`thumbnail_similar_${aiResult.confidence}%`);
              score += Math.min(aiResult.confidence, 50);
            }
            logStep("AI thumbnail result", { universeId, ...aiResult });
          }
        }

        // Only store if there's at least some signal
        if (score < 15 && matchReasons.length === 0) continue;

        // Determine player count trend
        const existing = existingMap.get(universeId);
        let playerCountTrend = 'stable';
        const previousPlayerCount = existing?.player_count || null;
        if (existing && previousPlayerCount !== null) {
          if (result.playerCount > previousPlayerCount * 1.2) playerCountTrend = 'rising';
          else if (result.playerCount < previousPlayerCount * 0.8) playerCountTrend = 'falling';
        }

        const detectionCount = existing ? (existing.detection_count || 1) + 1 : 1;

        const { data: upsertData, error: insertError } = await supabaseClient
          .from("ip_copy_detections")
          .upsert({
            registry_entry_id: entry.id,
            creator_id: entry.creator_id,
            search_keyword: matchedKeyword,
            detected_universe_id: universeId,
            detected_place_id: result.placeId || null,
            game_name: result.name,
            game_description: description ? description.substring(0, 500) : null,
            game_creator_name: result.creatorName,
            game_creator_id: result.creatorId,
            game_creator_type: result.creatorType,
            player_count: result.playerCount,
            similarity_score: Math.min(Math.round(score), 100),
            match_reasons: matchReasons,
            thumbnail_analyzed: thumbnailAnalyzed,
            creator_verified: creatorVerified,
            creator_group_id: creatorGroupId,
            creator_group_name: creatorGroupName,
            previous_player_count: previousPlayerCount,
            player_count_trend: playerCountTrend,
            detection_count: detectionCount,
            last_seen_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "registry_entry_id,detected_universe_id",
            ignoreDuplicates: false,
          })
          .select("id")
          .single();

        if (insertError) {
          logStep("Insert error", { error: insertError.message });
        } else {
          totalDetected++;

          // Create a historical snapshot
          if (upsertData?.id) {
            await supabaseClient
              .from("ip_detection_snapshots")
              .insert({
                detection_id: upsertData.id,
                player_count: result.playerCount,
                similarity_score: Math.min(Math.round(score), 100),
              });
            snapshotsCreated++;
          }
        }
      }
    }

    logStep("Enhanced scan complete", { totalSearches, totalDetected, thumbnailsAnalyzed, groupsVerified, snapshotsCreated });

    return new Response(
      JSON.stringify({
        success: true,
        total_searches: totalSearches,
        total_detected: totalDetected,
        thumbnails_analyzed: thumbnailsAnalyzed,
        groups_verified: groupsVerified,
        snapshots_created: snapshotsCreated,
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

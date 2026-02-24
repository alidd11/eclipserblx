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
  created?: string;
  updated?: string;
}

// ─── LEVENSHTEIN DISTANCE ───
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

// ─── SOUNDEX (Phonetic Matching) ───
function soundex(s: string): string {
  const a = s.toUpperCase().replace(/[^A-Z]/g, '');
  if (!a) return '';
  const map: Record<string, string> = {
    B: '1', F: '1', P: '1', V: '1',
    C: '2', G: '2', J: '2', K: '2', Q: '2', S: '2', X: '2', Z: '2',
    D: '3', T: '3', L: '4', M: '5', N: '5', R: '6',
  };
  let result = a[0];
  let prev = map[a[0]] || '0';
  for (let i = 1; i < a.length && result.length < 4; i++) {
    const code = map[a[i]] || '0';
    if (code !== '0' && code !== prev) {
      result += code;
    }
    prev = code;
  }
  return result.padEnd(4, '0');
}

// ─── N-GRAM SIMILARITY ───
function ngramSimilarity(a: string, b: string, n = 2): number {
  const ngrams = (s: string) => {
    const grams = new Set<string>();
    const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (let i = 0; i <= clean.length - n; i++) grams.add(clean.substring(i, i + n));
    return grams;
  };
  const ga = ngrams(a), gb = ngrams(b);
  if (ga.size === 0 && gb.size === 0) return 0;
  let intersection = 0;
  for (const g of ga) if (gb.has(g)) intersection++;
  const union = new Set([...ga, ...gb]).size;
  return union === 0 ? 0 : Math.round((intersection / union) * 100);
}

// ─── KEYWORD VARIANT GENERATION (Enhanced) ───
function generateKeywordVariants(keyword: string): string[] {
  const variants = new Set<string>();
  variants.add(keyword);

  const noSpecial = keyword.replace(/[^a-zA-Z0-9\s]/g, '');
  if (noSpecial !== keyword) variants.add(noSpecial);

  const spaced = keyword.replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (spaced !== keyword) variants.add(spaced);

  const words = spaced.split(' ').filter(w => w.length >= 3);

  // Always add individual significant words
  for (const w of words) {
    if (w.length >= 4) variants.add(w);
  }

  if (words.length >= 2) {
    variants.add(`${words[0]} ${words[words.length - 1]}`);
    // Pair combinations for multi-word titles
    for (let i = 0; i < words.length - 1; i++) {
      variants.add(`${words[i]} ${words[i + 1]}`);
    }
  }

  const withoutRP = spaced.replace(/\b(RP|Roleplay|Role Play|Simulator|Sim|Tycoon)\b/gi, '').replace(/\s+/g, ' ').trim();
  if (withoutRP.length >= 3 && withoutRP !== spaced) variants.add(withoutRP);

  if (!/\bRP\b/i.test(keyword) && words.length <= 3) {
    variants.add(`${keyword} RP`);
    variants.add(`${keyword} Roleplay`);
  }

  // Common copy naming patterns
  const baseTitle = spaced.replace(/\b(RP|Roleplay|Role Play)\b/gi, '').trim();
  if (baseTitle.length >= 3) {
    variants.add(`${baseTitle} 2`);
    variants.add(`Real ${baseTitle}`);
    variants.add(`New ${baseTitle}`);
    variants.add(`${baseTitle} Remake`);
    variants.add(`${baseTitle} Remastered`);
  }

  // Phonetic-aware: add soundex-based search hints (don't actually search these, but helps matching)
  const significantWords = words.filter(w => w.length >= 4);
  if (significantWords.length >= 1 && significantWords.join(' ') !== spaced) {
    variants.add(significantWords.join(' '));
  }

  return [...variants].slice(0, 20);
}

// ─── ROBLOX SEARCH: OMNI-SEARCH API ───
async function searchOmniAPI(keyword: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const sessionId = crypto.randomUUID().replace(/-/g, '');

  try {
    // Try both "all" and "experiences" page types for coverage
    for (const pageType of ['all', 'experiences']) {
      const url = `https://apis.roblox.com/search-api/omni-search?searchQuery=${encodeURIComponent(keyword)}&sessionId=${sessionId}&pageType=${pageType}`;
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        }
      });
      if (!res.ok) {
        await res.text();
        continue;
      }

      const data = await res.json();
      for (const section of (data?.searchResults || [])) {
        for (const item of (section?.contents || [])) {
          if (item.contentType === "Game" && item.universeId) {
            const uid = String(item.universeId);
            if (!results.find(r => r.universeId === uid)) {
              results.push({
                universeId: uid,
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
      if (results.length > 0) break;
    }
  } catch (err) {
    logStep("Omni-search error", { error: String(err) });
  }
  return results;
}

// ─── GAMES LIST API (Alternate search) ───
async function searchGamesAPI(keyword: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  try {
    const url = `https://games.roblox.com/v1/games/list?keyword=${encodeURIComponent(keyword)}&maxRows=25&includeUniverseDetails=true`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" }
    });
    if (!res.ok) return results;
    const data = await res.json();
    for (const game of (data?.games || [])) {
      if (game.universeId) {
        results.push({
          universeId: String(game.universeId),
          placeId: game.placeId ? String(game.placeId) : undefined,
          name: game.name || "Unknown",
          description: game.gameDescription || undefined,
          creatorName: game.creatorName || "Unknown",
          creatorId: String(game.creatorId || ""),
          creatorType: game.creatorType || "User",
          playerCount: game.playerCount || game.playing || 0,
        });
      }
    }
  } catch (err) {
    logStep("Games API search error", { error: String(err) });
  }
  return results;
}

// ─── FETCH GAME DETAILS ───
async function fetchGameDetails(universeIds: string[]): Promise<Map<string, { creatorName: string; creatorId: string; creatorType: string; playerCount: number; description: string | null; created: string | null; updated: string | null }>> {
  const details = new Map<string, { creatorName: string; creatorId: string; creatorType: string; playerCount: number; description: string | null; created: string | null; updated: string | null }>();

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
          created: game.created || null,
          updated: game.updated || null,
        });
      }
      if (i + 50 < universeIds.length) await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      logStep("Game details fetch error", { error: String(err) });
    }
  }
  return details;
}

// ─── COMBINED SEARCH (Multi-Source) ───
async function searchRobloxCombined(keyword: string): Promise<SearchResult[]> {
  // Run both search APIs concurrently
  const [omniResults, gamesResults] = await Promise.all([
    searchOmniAPI(keyword),
    searchGamesAPI(keyword),
  ]);

  // Merge and deduplicate
  const seen = new Map<string, SearchResult>();
  for (const r of [...omniResults, ...gamesResults]) {
    if (!seen.has(r.universeId)) {
      seen.set(r.universeId, r);
    }
  }

  const results = [...seen.values()];

  // Enrich any that lack creator info
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
        if (!result.description && detail.description) result.description = detail.description;
        if (detail.created) result.created = detail.created;
        if (detail.updated) result.updated = detail.updated;
      }
    }
  }

  return results;
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

// ─── FETCH GAME SCREENSHOTS (Multiple Thumbnails) ───
async function fetchGameScreenshots(universeId: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${universeId}&countPerUniverse=5&defaults=true&size=768x432&format=Png&isCircular=false`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const thumbs = data.data?.[0]?.thumbnails || [];
    return thumbs
      .filter((t: any) => t.state === "Completed" && t.imageUrl)
      .map((t: any) => t.imageUrl);
  } catch {
    return [];
  }
}

// ─── FETCH GAME STATS (visits, favorites, genre) ───
async function fetchGameStats(universeId: string): Promise<{
  visits: number | null;
  favorites: number | null;
  genre: string | null;
  maxPlayers: number | null;
  created: string | null;
  updated: string | null;
}> {
  try {
    const res = await fetch(
      `https://games.roblox.com/v1/games?universeIds=${universeId}`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return { visits: null, favorites: null, genre: null, maxPlayers: null, created: null, updated: null };
    const data = await res.json();
    const game = data.data?.[0];
    if (!game) return { visits: null, favorites: null, genre: null, maxPlayers: null, created: null, updated: null };
    return {
      visits: game.visits || null,
      favorites: game.favoritedCount || null,
      genre: game.genre || null,
      maxPlayers: game.maxPlayers || null,
      created: game.created || null,
      updated: game.updated || null,
    };
  } catch {
    return { visits: null, favorites: null, genre: null, maxPlayers: null, created: null, updated: null };
  }
}

// ─── FETCH GAME PASSES COUNT ───
async function fetchGamePassesCount(universeId: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://games.roblox.com/v1/games/${universeId}/game-passes?limit=100&sortOrder=Asc`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.length || 0;
  } catch {
    return null;
  }
}

// ─── FETCH GAME BADGES COUNT ───
async function fetchGameBadgesCount(universeId: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://badges.roblox.com/v1/universes/${universeId}/badges?limit=100&sortOrder=Asc`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.length || 0;
  } catch {
    return null;
  }
}

// ─── COLLECT COMPREHENSIVE EVIDENCE ───
async function collectEvidence(universeId: string, result: SearchResult, originalTitle: string): Promise<{
  screenshots: string[];
  stats: { visits: number | null; favorites: number | null; genre: string | null; maxPlayers: number | null; created: string | null; updated: string | null };
  passesCount: number | null;
  badgesCount: number | null;
  evidenceData: Record<string, unknown>;
}> {
  // Fetch all evidence in parallel
  const [screenshots, stats, passesCount, badgesCount] = await Promise.all([
    fetchGameScreenshots(universeId),
    fetchGameStats(universeId),
    fetchGamePassesCount(universeId),
    fetchGameBadgesCount(universeId),
  ]);

  const evidenceData = {
    captured_at: new Date().toISOString(),
    game_url: `https://www.roblox.com/games/${result.placeId || universeId}`,
    game_name_at_capture: result.name,
    game_description_at_capture: result.description?.substring(0, 1000) || null,
    creator_name_at_capture: result.creatorName,
    creator_id_at_capture: result.creatorId,
    creator_type: result.creatorType,
    player_count_at_capture: result.playerCount,
    visits_at_capture: stats.visits,
    favorites_at_capture: stats.favorites,
    genre: stats.genre,
    max_players: stats.maxPlayers,
    game_passes_count: passesCount,
    badges_count: badgesCount,
    screenshots_captured: screenshots.length,
    screenshot_urls: screenshots,
    original_work_title: originalTitle,
  };

  return { screenshots, stats, passesCount, badgesCount, evidenceData };
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

// ─── ENHANCED SIMILARITY SCORING ───
function computeNameSimilarity(original: string, candidate: string): number {
  const a = original.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const b = candidate.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

  if (a === b) return 100;
  if (b.includes(a) || a.includes(b)) return 85;

  // Jaccard word similarity
  const wordsA = new Set(a.split(/\s+/).filter(w => w.length >= 2));
  const wordsB = new Set(b.split(/\s+/).filter(w => w.length >= 2));
  const intersection = [...wordsA].filter(w => wordsB.has(w));
  const union = new Set([...wordsA, ...wordsB]);
  const jaccard = union.size === 0 ? 0 : Math.round((intersection.length / union.size) * 100);

  // Levenshtein-based edit distance similarity
  const maxLen = Math.max(a.length, b.length);
  const editSim = maxLen === 0 ? 0 : Math.round(((maxLen - levenshtein(a, b)) / maxLen) * 100);

  // N-gram similarity
  const ngram = ngramSimilarity(a, b, 3);

  // Phonetic match bonus (for main words)
  let phoneticBonus = 0;
  const mainWordA = [...wordsA].sort((x, y) => y.length - x.length)[0];
  const mainWordB = [...wordsB].sort((x, y) => y.length - x.length)[0];
  if (mainWordA && mainWordB && soundex(mainWordA) === soundex(mainWordB) && mainWordA !== mainWordB) {
    phoneticBonus = 15;
  }

  // Weighted combination
  const combined = Math.round(jaccard * 0.35 + editSim * 0.35 + ngram * 0.2 + phoneticBonus * 0.1);
  return Math.min(combined, 100);
}

// ─── ENHANCED DESCRIPTION PLAGIARISM DETECTION ───
function checkDescriptionMatch(description: string, keywords: string[], originalDesc?: string | null): { isMatch: boolean; score: number; reasons: string[] } {
  const descLower = description.toLowerCase();
  const reasons: string[] = [];
  let score = 0;

  // Direct keyword mention
  for (const kw of keywords) {
    const kwLower = kw.toLowerCase();
    if (kwLower.length >= 4 && descLower.includes(kwLower)) {
      reasons.push('keyword_in_description');
      score += 20;
      break;
    }
  }

  // Suspicious clone/copy phrases
  const suspiciousPhrases = [
    'better version', 'improved version', 'remake of', 'inspired by',
    'based on', 'similar to', 'copy of', 'clone of', 'original by',
    'recreated', 'fan made', 'fan-made', 'unofficial', 'not affiliated',
    'tribute to', 'parody of', 'ripoff', 'rip-off', 'rip off',
  ];

  for (const phrase of suspiciousPhrases) {
    if (descLower.includes(phrase)) {
      reasons.push(`suspicious_phrase:${phrase}`);
      score += 25;
      break; // only count once
    }
  }

  // If we have the original description, compare them for plagiarism
  if (originalDesc && originalDesc.length > 30) {
    const origLower = originalDesc.toLowerCase();
    
    // N-gram overlap for description plagiarism
    const descNgram = ngramSimilarity(origLower, descLower, 4);
    if (descNgram >= 40) {
      reasons.push(`description_plagiarism_${descNgram}%`);
      score += Math.min(descNgram, 40);
    }

    // Check if significant sentences from original appear in candidate
    const origSentences = origLower.split(/[.!?\n]+/).filter(s => s.trim().length > 20);
    for (const sentence of origSentences.slice(0, 5)) {
      const trimmed = sentence.trim();
      if (trimmed.length > 25 && descLower.includes(trimmed)) {
        reasons.push('sentence_copied');
        score += 30;
        break;
      }
    }
  }

  return { isMatch: score > 0, score: Math.min(score, 50), reasons };
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
- Common templates vs genuinely copied designs

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

// ─── FETCH ORIGINAL GAME DESCRIPTION ───
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

  logStep("Enhanced copy detection scan started (v2)");

  try {
    // Check if specific entry requested (for auto-scan on registry add)
    let body: { registry_entry_id?: string } = {};
    try { body = await req.json(); } catch { /* no body = scan all */ }

    let registryQuery = supabaseClient
      .from("creator_ip_registry")
      .select("id, creator_id, title, description, search_keywords, roblox_universe_ids")
      .not("creator_id", "is", null);

    if (body.registry_entry_id) {
      registryQuery = registryQuery.eq("id", body.registry_entry_id);
    }

    const { data: registryEntries, error: registryError } = await registryQuery;

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
    let evidenceCollected = 0;

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

      // Fetch original game thumbnail and description for comparison
      let originalThumbUrl: string | null = null;
      let originalDescription: string | null = entry.description || null;
      if (ownUniverseIds.size > 0) {
        const firstUniverse = [...ownUniverseIds][0];
        originalThumbUrl = await fetchGameThumbnail(firstUniverse);
        if (!originalDescription) {
          originalDescription = await fetchGameDescription(firstUniverse);
        }
      }

      // Deduplicate results across all keyword variants
      const allResults = new Map<string, { result: SearchResult; matchedKeyword: string }>();

      for (const keyword of keywords) {
        totalSearches++;
        if (totalSearches > 1) await new Promise(r => setTimeout(r, 600));

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

      // Fetch existing detections for this entry
      const { data: existingDetections } = await supabaseClient
        .from("ip_copy_detections")
        .select("id, detected_universe_id, player_count, similarity_score, detection_count")
        .eq("registry_entry_id", entry.id);

      const existingMap = new Map(
        (existingDetections || []).map((d: any) => [d.detected_universe_id, d])
      );

      // Process each unique result
      for (const [universeId, { result, matchedKeyword }] of allResults) {
        const matchReasons: string[] = [];
        let score = 0;

        // 1. Enhanced name similarity (Levenshtein + Jaccard + N-gram + Phonetic)
        const nameSim = computeNameSimilarity(entry.title, result.name);
        if (nameSim >= 50) {
          matchReasons.push(`name_match_${nameSim}%`);
          score += nameSim;
        } else if (nameSim >= 30) {
          matchReasons.push(`partial_name_${nameSim}%`);
          score += nameSim / 2;
        }

        // 2. Enhanced description plagiarism detection
        let description = result.description || null;
        if (!description) {
          description = await fetchGameDescription(universeId);
          await new Promise(r => setTimeout(r, 200));
        }

        if (description) {
          const descResult = checkDescriptionMatch(description, baseKeywords, originalDescription);
          if (descResult.isMatch) {
            matchReasons.push(...descResult.reasons);
            score += descResult.score;
          }
        }

        // 3. Creator group/owner verification
        let creatorVerified = false;
        let creatorGroupId: string | null = null;
        let creatorGroupName: string | null = null;

        if (result.creatorType === 'Group' && creatorRobloxId && groupsVerified < 25) {
          const groupInfo = await fetchCreatorGroupInfo(result.creatorId, result.creatorType);
          if (groupInfo) {
            creatorGroupId = groupInfo.groupId;
            creatorGroupName = groupInfo.groupName;

            const isMember = await isUserInGroup(creatorRobloxId, groupInfo.groupId);
            if (isMember) {
              creatorVerified = true;
              matchReasons.push("creator_owns_group");
              score = Math.max(0, score - 50);
            }
            groupsVerified++;
            await new Promise(r => setTimeout(r, 300));
          }
        } else if (creatorRobloxId && result.creatorId === creatorRobloxId) {
          creatorVerified = true;
        }

        // 4. AI Thumbnail comparison (with higher limit)
        let thumbnailAnalyzed = false;
        let thumbnailUrl: string | null = null;
        if (originalThumbUrl && score >= 15 && thumbnailsAnalyzed < 15 && !creatorVerified) {
          thumbnailUrl = await fetchGameThumbnail(universeId);
          if (thumbnailUrl) {
            await new Promise(r => setTimeout(r, 500));
            const aiResult = await compareThumbnailsAI(
              originalThumbUrl, thumbnailUrl, entry.title, result.name
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

        // 5. AUTO-EVIDENCE COLLECTION for medium+ threats
        let evidenceData: Record<string, unknown> = {};
        let evidenceScreenshots: string[] = [];
        let gameBadgesCount: number | null = null;
        let gamePassesCount: number | null = null;
        let gameFavorites: number | null = null;
        let gameVisits: number | null = null;
        let gameGenre: string | null = null;
        let gameUpdatedAt: string | null = null;
        let evidenceCapturedAt: string | null = null;

        if (score >= 30 && !creatorVerified) {
          logStep("Collecting evidence", { universeId, score });
          try {
            const evidence = await collectEvidence(universeId, result, entry.title);
            evidenceData = evidence.evidenceData;
            evidenceScreenshots = evidence.screenshots;
            gameBadgesCount = evidence.badgesCount;
            gamePassesCount = evidence.passesCount;
            gameFavorites = evidence.stats.favorites;
            gameVisits = evidence.stats.visits;
            gameGenre = evidence.stats.genre;
            gameUpdatedAt = evidence.stats.updated;
            evidenceCapturedAt = new Date().toISOString();
            evidenceCollected++;
            await new Promise(r => setTimeout(r, 300));
          } catch (err) {
            logStep("Evidence collection error", { universeId, error: String(err) });
          }
        }

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
            thumbnail_url: thumbnailUrl,
            creator_verified: creatorVerified,
            creator_group_id: creatorGroupId,
            creator_group_name: creatorGroupName,
            previous_player_count: previousPlayerCount,
            player_count_trend: playerCountTrend,
            detection_count: detectionCount,
            game_created_at: result.created || null,
            game_updated_at: gameUpdatedAt,
            last_seen_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            // Evidence fields
            evidence_data: Object.keys(evidenceData).length > 0 ? evidenceData : undefined,
            evidence_screenshots: evidenceScreenshots.length > 0 ? evidenceScreenshots : undefined,
            game_badges_count: gameBadgesCount,
            game_passes_count: gamePassesCount,
            game_favorites: gameFavorites,
            game_visits: gameVisits,
            game_genre: gameGenre,
            evidence_captured_at: evidenceCapturedAt,
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

          // Create a historical snapshot with evidence
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

    logStep("Enhanced scan complete (v3)", { totalSearches, totalDetected, thumbnailsAnalyzed, groupsVerified, snapshotsCreated, evidenceCollected });

    return new Response(
      JSON.stringify({
        success: true,
        total_searches: totalSearches,
        total_detected: totalDetected,
        thumbnails_analyzed: thumbnailsAnalyzed,
        groups_verified: groupsVerified,
        snapshots_created: snapshotsCreated,
        evidence_collected: evidenceCollected,
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

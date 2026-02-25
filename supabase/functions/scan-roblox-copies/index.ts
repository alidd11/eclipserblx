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

// ─── COMMON NAME BLOCKLIST (Suppress generic matches) ───
const GENERIC_NAMES = new Set([
  'obby', 'tycoon', 'simulator', 'roleplay', 'rp', 'story', 'escape',
  'tower defense', 'battle', 'war', 'survive', 'survival', 'horror',
  'hide and seek', 'tag', 'racing', 'speed run', 'parkour', 'hangout',
  'adopt me', 'pet simulator', 'clicker', 'idle', 'quiz', 'trivia',
  'murder mystery', 'cops and robbers', 'prison', 'school', 'hospital',
  'restaurant', 'pizza', 'shop', 'store', 'mall', 'city', 'town',
  'island', 'world', 'land', 'kingdom', 'empire', 'factory', 'base',
]);

function isGenericName(name: string): boolean {
  const cleaned = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  if (GENERIC_NAMES.has(cleaned)) return true;
  // Also check if the name is just 1-2 very common words
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length <= 2 && words.every(w => GENERIC_NAMES.has(w))) return true;
  return false;
}

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

// ─── TOKEN SET RATIO (Fuzzy Token Matching) ───
function tokenSetRatio(a: string, b: string): number {
  const tokensA = new Set(a.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean));
  const tokensB = new Set(b.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean));
  
  const intersection = [...tokensA].filter(t => tokensB.has(t));
  const onlyA = [...tokensA].filter(t => !tokensB.has(t));
  const onlyB = [...tokensB].filter(t => !tokensA.has(t));
  
  const sorted_intersection = intersection.sort().join(' ');
  const combined_a = [...intersection.sort(), ...onlyA.sort()].join(' ');
  const combined_b = [...intersection.sort(), ...onlyB.sort()].join(' ');
  
  if (!sorted_intersection && !combined_a && !combined_b) return 0;
  
  const ratio = (s1: string, s2: string) => {
    const maxLen = Math.max(s1.length, s2.length);
    if (maxLen === 0) return 100;
    return Math.round(((maxLen - levenshtein(s1, s2)) / maxLen) * 100);
  };
  
  return Math.max(
    ratio(sorted_intersection, combined_a),
    ratio(sorted_intersection, combined_b),
    ratio(combined_a, combined_b)
  );
}

// ─── KEYWORD EXTRACTION FROM DESCRIPTION ───
function extractDescriptionKeywords(description: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall',
    'this', 'that', 'these', 'those', 'it', 'its', 'you', 'your', 'we', 'our', 'they', 'their',
    'not', 'no', 'all', 'any', 'each', 'every', 'some', 'more', 'most', 'other', 'than',
    'also', 'just', 'very', 'even', 'only', 'game', 'play', 'roblox', 'join', 'like', 'new',
    'get', 'make', 'now', 'come', 'here', 'there', 'where', 'when', 'how', 'what', 'who',
  ]);
  
  const words = description.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !stopWords.has(w));
  
  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
  
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
}

// ─── KEYWORD VARIANT GENERATION (v2 - tighter, fewer noise searches) ───
function generateKeywordVariants(keyword: string): string[] {
  const variants = new Set<string>();
  variants.add(keyword);

  const noSpecial = keyword.replace(/[^a-zA-Z0-9\s]/g, '');
  if (noSpecial !== keyword && noSpecial.length >= 3) variants.add(noSpecial);

  const spaced = keyword.replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (spaced !== keyword && spaced.length >= 3) variants.add(spaced);

  const words = spaced.split(' ').filter(w => w.length >= 3);

  // Only search individual words if they are long enough to be distinctive (6+ chars)
  // Short words like "UKRP" or "West" produce too much noise on their own
  for (const w of words) {
    if (w.length >= 6) variants.add(w);
  }

  // Adjacent word pairs (core context)
  if (words.length >= 2) {
    for (let i = 0; i < words.length - 1; i++) {
      variants.add(`${words[i]} ${words[i + 1]}`);
    }
  }

  // Strip RP/Roleplay suffix to find the core name
  const withoutRP = spaced.replace(/\b(RP|Roleplay|Role Play|Simulator|Sim|Tycoon)\b/gi, '').replace(/\s+/g, ' ').trim();
  if (withoutRP.length >= 4 && withoutRP !== spaced) variants.add(withoutRP);

  // Add RP/Roleplay variants only if original doesn't have them
  if (!/\bRP\b/i.test(keyword) && words.length <= 3) {
    variants.add(`${keyword} RP`);
    variants.add(`${keyword} Roleplay`);
  }

  // Only add clone-style variants for the core distinctive name (no generic prefixes)
  const baseTitle = withoutRP.length >= 4 ? withoutRP : spaced;
  if (baseTitle.length >= 5) {
    variants.add(`${baseTitle} 2`);
    variants.add(`${baseTitle} Remake`);
  }

  return [...variants].slice(0, 15);
}

// ─── ROBLOX SEARCH: OMNI-SEARCH API ───
async function searchOmniAPI(keyword: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const sessionId = crypto.randomUUID().replace(/-/g, '');

  try {
    for (const pageType of ['all', 'experiences']) {
      const url = `https://apis.roblox.com/search-api/omni-search?searchQuery=${encodeURIComponent(keyword)}&sessionId=${sessionId}&pageType=${pageType}`;
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        }
      });
      if (!res.ok) { await res.text(); continue; }

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

// ─── GAMES LIST API ───
async function searchGamesAPI(keyword: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  try {
    const url = `https://games.roblox.com/v1/games/list?keyword=${encodeURIComponent(keyword)}&maxRows=25&includeUniverseDetails=true`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
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

// ─── SEARCH USER CREATIONS ───
async function searchUserCreations(userId: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  try {
    const res = await fetch(
      `https://games.roblox.com/v2/users/${userId}/games?limit=50&sortOrder=Desc&accessFilter=Public`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return results;
    const data = await res.json();
    for (const game of (data?.data || [])) {
      if (game.id) {
        results.push({
          universeId: String(game.id),
          placeId: game.rootPlace?.id ? String(game.rootPlace.id) : undefined,
          name: game.name || "Unknown",
          description: undefined,
          creatorName: "Unknown",
          creatorId: userId,
          creatorType: "User",
          playerCount: game.playing || 0,
          created: game.created || undefined,
          updated: game.updated || undefined,
        });
      }
    }
  } catch (err) {
    logStep("User creations search error", { error: String(err) });
  }
  return results;
}

// ─── SEARCH GROUP GAMES ───
async function searchGroupGames(groupId: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  try {
    const res = await fetch(
      `https://games.roblox.com/v2/groups/${groupId}/games?limit=50&sortOrder=Desc&accessFilter=Public`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return results;
    const data = await res.json();
    for (const game of (data?.data || [])) {
      if (game.id) {
        results.push({
          universeId: String(game.id),
          placeId: game.rootPlace?.id ? String(game.rootPlace.id) : undefined,
          name: game.name || "Unknown",
          description: undefined,
          creatorName: "Unknown",
          creatorId: groupId,
          creatorType: "Group",
          playerCount: game.playing || 0,
          created: game.created || undefined,
          updated: game.updated || undefined,
        });
      }
    }
  } catch (err) {
    logStep("Group games search error", { error: String(err) });
  }
  return results;
}

// ─── CATALOG ASSET SEARCH ───
async function searchCatalogAssets(keyword: string, category: string = "DeveloperModels"): Promise<{ assetId: string; name: string; creatorName: string; creatorId: string }[]> {
  const results: { assetId: string; name: string; creatorName: string; creatorId: string }[] = [];
  try {
    const res = await fetch(
      `https://catalog.roblox.com/v1/search/items?keyword=${encodeURIComponent(keyword)}&category=${category}&limit=25&sortType=Relevance`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return results;
    const data = await res.json();
    for (const item of (data?.data || [])) {
      results.push({
        assetId: String(item.id),
        name: item.name || "Unknown",
        creatorName: item.creatorName || "Unknown",
        creatorId: String(item.creatorTargetId || ""),
      });
    }
  } catch (err) {
    logStep("Catalog search error", { error: String(err) });
  }
  return results;
}

// ─── UNIFIED GAME DETAILS FETCH (Replaces redundant fetchGameDescription/fetchGameCreatedDate/fetchGameStats) ───
interface GameDetails {
  description: string | null;
  created: string | null;
  updated: string | null;
  visits: number | null;
  favorites: number | null;
  genre: string | null;
  maxPlayers: number | null;
  creatorName: string;
  creatorId: string;
  creatorType: string;
  playerCount: number;
}

async function fetchGameDetailsBatch(universeIds: string[]): Promise<Map<string, GameDetails>> {
  const details = new Map<string, GameDetails>();

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
          description: game.description || null,
          created: game.created || null,
          updated: game.updated || null,
          visits: game.visits || null,
          favorites: game.favoritedCount || null,
          genre: game.genre || null,
          maxPlayers: game.maxPlayers || null,
          creatorName: game.creator?.name || "Unknown",
          creatorId: String(game.creator?.id || ""),
          creatorType: game.creator?.type || "Unknown",
          playerCount: game.playing || 0,
        });
      }
      if (i + 50 < universeIds.length) await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      logStep("Game details fetch error", { error: String(err) });
    }
  }
  return details;
}

async function fetchSingleGameDetails(universeId: string): Promise<GameDetails | null> {
  const map = await fetchGameDetailsBatch([universeId]);
  return map.get(universeId) || null;
}

// ─── COMBINED SEARCH ───
async function searchRobloxCombined(keyword: string): Promise<SearchResult[]> {
  const [omniResults, gamesResults] = await Promise.all([
    searchOmniAPI(keyword),
    searchGamesAPI(keyword),
  ]);

  const seen = new Map<string, SearchResult>();
  for (const r of [...omniResults, ...gamesResults]) {
    if (!seen.has(r.universeId)) {
      seen.set(r.universeId, r);
    }
  }

  const results = [...seen.values()];

  // Enrich results missing creator info via single batch call
  const needsEnrichment = results.filter(r => r.creatorId === "" || r.creatorName === "Unknown");
  if (needsEnrichment.length > 0) {
    const universeIds = needsEnrichment.map(r => r.universeId);
    const details = await fetchGameDetailsBatch(universeIds);

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

// ─── FETCH GAME SCREENSHOTS ───
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

// ─── FETCH GAME SOCIAL LINKS ───
async function fetchGameSocialLinks(universeId: string): Promise<{ title: string; url: string; type: string }[]> {
  try {
    const res = await fetch(
      `https://games.roblox.com/v1/games/${universeId}/social-links/list`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).map((link: any) => ({
      title: link.title || "",
      url: link.url || "",
      type: link.type || "Unknown",
    }));
  } catch {
    return [];
  }
}

// ─── FETCH GAME VOTES ───
async function fetchGameVotes(universeId: string): Promise<{ upVotes: number; downVotes: number } | null> {
  try {
    const res = await fetch(
      `https://games.roblox.com/v1/games/votes?universeIds=${universeId}`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const game = data.data?.[0];
    if (!game) return null;
    return { upVotes: game.upVotes || 0, downVotes: game.downVotes || 0 };
  } catch {
    return null;
  }
}

// ─── COLLECT COMPREHENSIVE EVIDENCE (Uses pre-fetched details) ───
async function collectEvidence(universeId: string, result: SearchResult, originalTitle: string, originalCreated?: string | null, preloadedDetails?: GameDetails | null): Promise<{
  screenshots: string[];
  details: GameDetails | null;
  passesCount: number | null;
  badgesCount: number | null;
  socialLinks: { title: string; url: string; type: string }[];
  votes: { upVotes: number; downVotes: number } | null;
  creationDateSuspicious: boolean;
  evidenceData: Record<string, unknown>;
}> {
  // Use pre-loaded details or fetch fresh (single call, no redundant requests)
  const detailsPromise = preloadedDetails ? Promise.resolve(preloadedDetails) : fetchSingleGameDetails(universeId);

  const [details, screenshots, passesCount, badgesCount, socialLinks, votes] = await Promise.all([
    detailsPromise,
    fetchGameScreenshots(universeId),
    fetchGamePassesCount(universeId),
    fetchGameBadgesCount(universeId),
    fetchGameSocialLinks(universeId),
    fetchGameVotes(universeId),
  ]);

  // Creation date analysis
  let creationDateSuspicious = false;
  const copyCreated = details?.created || result.created || null;
  if (originalCreated && copyCreated) {
    const origDate = new Date(originalCreated);
    const copyDate = new Date(copyCreated);
    if (copyDate > origDate) {
      creationDateSuspicious = true;
    }
  }

  // Vote ratio analysis
  let voteRatio: number | null = null;
  if (votes && (votes.upVotes + votes.downVotes) > 10) {
    voteRatio = Math.round((votes.downVotes / (votes.upVotes + votes.downVotes)) * 100);
  }

  // Update frequency
  let updateFrequency: string | null = null;
  const created = details?.created || result.created;
  const updated = details?.updated || result.updated;
  if (created && updated) {
    const createdDate = new Date(created);
    const updatedDate = new Date(updated);
    const ageDays = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
    const daysSinceUpdate = (Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (ageDays > 365 && daysSinceUpdate < 7) updateFrequency = 'recently_revived';
    else if (daysSinceUpdate < 30) updateFrequency = 'active';
    else if (daysSinceUpdate < 180) updateFrequency = 'semi_active';
    else updateFrequency = 'abandoned';
  }

  const evidenceData = {
    captured_at: new Date().toISOString(),
    game_url: `https://www.roblox.com/games/${result.placeId || universeId}`,
    game_name_at_capture: result.name,
    game_description_at_capture: (details?.description || result.description)?.substring(0, 1000) || null,
    creator_name_at_capture: result.creatorName,
    creator_id_at_capture: result.creatorId,
    creator_type: result.creatorType,
    player_count_at_capture: result.playerCount,
    visits_at_capture: details?.visits || null,
    favorites_at_capture: details?.favorites || null,
    genre: details?.genre || null,
    max_players: details?.maxPlayers || null,
    game_passes_count: passesCount,
    badges_count: badgesCount,
    screenshots_captured: screenshots.length,
    screenshot_urls: screenshots,
    original_work_title: originalTitle,
    social_links: socialLinks,
    votes: votes,
    vote_downvote_ratio: voteRatio,
    creation_date_suspicious: creationDateSuspicious,
    update_frequency: updateFrequency,
    original_created_at: originalCreated || null,
    copy_created_at: copyCreated,
  };

  return { screenshots, details, passesCount, badgesCount, socialLinks, votes, creationDateSuspicious, evidenceData };
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

// ─── CHECK IF USER IS IN GROUP ───
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

// ─── CAPPED SIMILARITY SCORING ───
// Each signal has a hard cap to prevent score inflation
const SCORE_CAPS = {
  nameMatch: 45,       // Max contribution from name similarity
  description: 30,     // Max contribution from description analysis
  creationDate: 12,    // Max contribution from creation date
  thumbnail: 35,       // Max contribution from AI thumbnail
  // Total theoretical max ≈ 122, clamped to 100
};

function computeNameSimilarity(original: string, candidate: string): number {
  const a = original.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const b = candidate.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

  if (a === b) return 100;
  if (b.includes(a) || a.includes(b)) return 85;

  const wordsA = new Set(a.split(/\s+/).filter(w => w.length >= 2));
  const wordsB = new Set(b.split(/\s+/).filter(w => w.length >= 2));
  const intersection = [...wordsA].filter(w => wordsB.has(w));
  const union = new Set([...wordsA, ...wordsB]);
  const jaccard = union.size === 0 ? 0 : Math.round((intersection.length / union.size) * 100);

  const maxLen = Math.max(a.length, b.length);
  const editSim = maxLen === 0 ? 0 : Math.round(((maxLen - levenshtein(a, b)) / maxLen) * 100);

  const ngram = ngramSimilarity(a, b, 3);
  const tokenSet = tokenSetRatio(a, b);

  let phoneticBonus = 0;
  const mainWordA = [...wordsA].sort((x, y) => y.length - x.length)[0];
  const mainWordB = [...wordsB].sort((x, y) => y.length - x.length)[0];
  if (mainWordA && mainWordB && soundex(mainWordA) === soundex(mainWordB) && mainWordA !== mainWordB) {
    phoneticBonus = 15;
  }

  const combined = Math.round(
    jaccard * 0.25 + editSim * 0.25 + ngram * 0.15 + tokenSet * 0.25 + phoneticBonus * 0.1
  );
  return Math.min(combined, 100);
}

// ─── DESCRIPTION PLAGIARISM DETECTION ───
function checkDescriptionMatch(description: string, keywords: string[], originalDesc?: string | null): { isMatch: boolean; score: number; reasons: string[] } {
  const descLower = description.toLowerCase();
  const reasons: string[] = [];
  let score = 0;

  // Direct keyword mention
  for (const kw of keywords) {
    const kwLower = kw.toLowerCase();
    if (kwLower.length >= 4 && descLower.includes(kwLower)) {
      reasons.push('keyword_in_description');
      score += 15;
      break;
    }
  }

  // Suspicious clone/copy phrases
  const suspiciousPhrases = [
    'better version', 'improved version', 'remake of', 'inspired by',
    'based on', 'similar to', 'copy of', 'clone of', 'original by',
    'recreated', 'fan made', 'fan-made', 'unofficial', 'not affiliated',
    'tribute to', 'parody of', 'ripoff', 'rip-off', 'rip off',
    'remastered', 'revamped', 'we are not', 'no affiliation',
    'before it was deleted', 'original was deleted', 'bringing back',
    'stolen from', 'taken from', 'credits to', 'all credit',
  ];

  let suspiciousCount = 0;
  for (const phrase of suspiciousPhrases) {
    if (descLower.includes(phrase)) {
      if (suspiciousCount === 0) {
        reasons.push(`suspicious_phrase:${phrase}`);
        score += 20;
      } else {
        score += 5; // Diminishing returns for additional phrases
      }
      suspiciousCount++;
      if (suspiciousCount >= 3) break;
    }
  }

  // Compare against original description for plagiarism
  if (originalDesc && originalDesc.length > 30) {
    const origLower = originalDesc.toLowerCase();
    
    const descNgram = ngramSimilarity(origLower, descLower, 4);
    if (descNgram >= 40) {
      reasons.push(`description_plagiarism_${descNgram}%`);
      score += Math.min(Math.round(descNgram * 0.4), 25);
    }

    // Sentence-level copying
    const origSentences = origLower.split(/[.!?\n]+/).filter(s => s.trim().length > 20);
    let sentencesCopied = 0;
    for (const sentence of origSentences.slice(0, 8)) {
      const trimmed = sentence.trim();
      if (trimmed.length > 25 && descLower.includes(trimmed)) {
        sentencesCopied++;
      }
    }
    if (sentencesCopied > 0) {
      reasons.push(`sentences_copied:${sentencesCopied}`);
      score += Math.min(sentencesCopied * 10, 25);
    }

    // Keyword extraction overlap
    const origKeywords = extractDescriptionKeywords(originalDesc);
    const candidateKeywords = extractDescriptionKeywords(description);
    const keywordOverlap = origKeywords.filter(k => candidateKeywords.includes(k));
    if (keywordOverlap.length >= 3) {
      reasons.push(`keyword_overlap:${keywordOverlap.length}/${origKeywords.length}`);
      score += Math.min(keywordOverlap.length * 3, 15);
    }
  }

  // Hard cap description contribution
  return { isMatch: score > 0, score: Math.min(score, SCORE_CAPS.description), reasons };
}

// ─── AI THUMBNAIL COMPARISON (Upgraded to gemini-2.5-flash) ───
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
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are an IP infringement detection system for Roblox games. Compare these two game thumbnails and determine if the second game appears to be a copy, clone, or stolen version of the first.

Original game: "${originalTitle}"
Candidate game: "${candidateTitle}"

IMPORTANT: Be strict. Many Roblox games share common template art styles - only flag if there is CLEAR evidence of copying (same custom artwork, identical layouts with minor changes, reused unique assets). Generic similarities (both use low-poly style, both have a city background) should NOT be flagged.

Consider:
- Identical or near-identical custom artwork/logos
- Same unique character designs or compositions
- Reused specific assets that are clearly from the original
- Text/branding that references or mimics the original

Do NOT flag:
- Generic Roblox template styles used by many games
- Common color schemes or generic backgrounds
- Standard UI elements or common game thumbnails

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

  logStep("Enhanced copy detection scan started (v6 - accuracy overhaul)");

  try {
    let body: { registry_entry_id?: string; custom_search_terms?: string[] } = {};
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

    // Pre-fetch user group memberships for ownership verification
    const userGroupsCache = new Map<string, Set<string>>();
    async function getUserGroups(robloxUserId: string): Promise<Set<string>> {
      if (userGroupsCache.has(robloxUserId)) return userGroupsCache.get(robloxUserId)!;
      try {
        const res = await fetch(
          `https://groups.roblox.com/v1/users/${robloxUserId}/groups/roles`,
          { headers: { Accept: "application/json" } }
        );
        if (!res.ok) {
          userGroupsCache.set(robloxUserId, new Set());
          return new Set();
        }
        const data = await res.json();
        const groupIds = new Set((data.data || []).map((g: any) => String(g.group?.id)).filter(Boolean));
        userGroupsCache.set(robloxUserId, groupIds);
        return groupIds;
      } catch {
        userGroupsCache.set(robloxUserId, new Set());
        return new Set();
      }
    }

    let totalSearches = 0;
    let totalDetected = 0;
    let thumbnailsAnalyzed = 0;
    let groupsVerified = 0;
    let snapshotsCreated = 0;
    let evidenceCollected = 0;
    let suspiciousCreatorsScanned = 0;
    let genericSkipped = 0;

    const suspiciousCreators = new Map<string, { creatorType: string; matchCount: number }>();

    for (const entry of registryEntries) {
      const creatorProfile = profileMap.get(entry.creator_id);
      const creatorRobloxId = creatorProfile?.roblox_user_id;

      // FIX: Skip entries with generic names that would produce only noise
      if (isGenericName(entry.title)) {
        logStep("Skipping generic title", { title: entry.title });
        genericSkipped++;
        continue;
      }

      // Pre-fetch creator's group memberships once (reused for all results)
      let creatorGroupIds: Set<string> = new Set();
      if (creatorRobloxId) {
        creatorGroupIds = await getUserGroups(creatorRobloxId);
      }

      // If custom search terms provided, use ONLY those (exact user intent)
      // Otherwise fall back to auto-generated keyword variants
      let uniqueKeywords: string[];
      const baseKeywords: string[] = [];
      if (entry.title) baseKeywords.push(entry.title);
      if (entry.search_keywords) {
        for (const kw of entry.search_keywords) {
          if (!baseKeywords.includes(kw)) baseKeywords.push(kw);
        }
      }

      if (body.custom_search_terms && body.custom_search_terms.length > 0) {
        uniqueKeywords = [...new Set(body.custom_search_terms.map(s => s.trim()).filter(Boolean))].slice(0, 10);
        logStep("Using custom search terms", { terms: uniqueKeywords });
      } else {
        if (baseKeywords.length === 0) continue;

        const keywords = baseKeywords.flatMap(kw => generateKeywordVariants(kw));
        uniqueKeywords = [...new Set(keywords)];
      }

      logStep("Scanning entry", { title: entry.title, keywords: uniqueKeywords.length });

      const ownUniverseIds = new Set(entry.roblox_universe_ids || []);

      // Fetch original game details in ONE call (replaces 3 separate calls)
      let originalThumbUrl: string | null = null;
      let originalDescription: string | null = entry.description || null;
      let originalCreatedDate: string | null = null;

      if (entry.roblox_universe_ids && entry.roblox_universe_ids.length > 0) {
        const firstUniverse = entry.roblox_universe_ids[0];
        const [thumb, details] = await Promise.all([
          fetchGameThumbnail(firstUniverse),
          fetchSingleGameDetails(firstUniverse),
        ]);
        originalThumbUrl = thumb;
        if (details) {
          if (!originalDescription && details.description) originalDescription = details.description;
          originalCreatedDate = details.created;
        }
      }

      // Deduplicate results across all keyword variants
      const allResults = new Map<string, { result: SearchResult; matchedKeyword: string }>();

      for (const keyword of uniqueKeywords) {
        totalSearches++;
        if (totalSearches > 1) await new Promise(r => setTimeout(r, 600));

        const searchResults = await searchRobloxCombined(keyword);
        logStep("Search results", { keyword, count: searchResults.length });

        for (const result of searchResults) {
          // FIX: Skip own games - check BOTH direct user ID AND group ownership
          if (creatorRobloxId && result.creatorId === creatorRobloxId) continue;
          if (result.creatorType === 'Group' && creatorGroupIds.has(result.creatorId)) continue;
          if (ownUniverseIds.has(result.universeId)) continue;

          if (!allResults.has(result.universeId)) {
            allResults.set(result.universeId, { result, matchedKeyword: keyword });
          }
        }
      }

      logStep("Unique results to process", { count: allResults.size });

      // Batch-fetch details for all candidate games in one call
      const candidateUniverseIds = [...allResults.keys()];
      const candidateDetailsMap = candidateUniverseIds.length > 0
        ? await fetchGameDetailsBatch(candidateUniverseIds)
        : new Map<string, GameDetails>();

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
        let nameScore = 0;
        let descScore = 0;
        let dateScore = 0;
        let thumbScore = 0;

        // Use batch-fetched details (no extra API call)
        const cachedDetails = candidateDetailsMap.get(universeId) || null;
        const description = result.description || cachedDetails?.description || null;
        const gameCreated = result.created || cachedDetails?.created || null;
        const gameUpdated = cachedDetails?.updated || result.updated || null;

        // 1. Name similarity (capped)
        const nameSim = computeNameSimilarity(entry.title, result.name);
        if (nameSim >= 50) {
          matchReasons.push(`name_match_${nameSim}%`);
          nameScore = Math.min(nameSim, SCORE_CAPS.nameMatch);
        } else if (nameSim >= 30) {
          matchReasons.push(`partial_name_${nameSim}%`);
          nameScore = Math.min(Math.round(nameSim / 2), SCORE_CAPS.nameMatch);
        }

        // 2. Description plagiarism (capped internally)
        if (description) {
          const descResult = checkDescriptionMatch(description, baseKeywords, originalDescription);
          if (descResult.isMatch) {
            matchReasons.push(...descResult.reasons);
            descScore = descResult.score; // Already capped
          }
        }

        // 3. Creation date (capped, SINGLE check - no double counting)
        if (originalCreatedDate && gameCreated) {
          const origDate = new Date(originalCreatedDate);
          const copyDate = new Date(gameCreated);
          if (copyDate > origDate) {
            const daysDiff = Math.round((copyDate.getTime() - origDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff < 30) {
              matchReasons.push(`created_${daysDiff}d_after_original`);
              dateScore = SCORE_CAPS.creationDate;
            } else if (daysDiff < 180) {
              matchReasons.push(`created_${daysDiff}d_after_original`);
              dateScore = Math.round(SCORE_CAPS.creationDate * 0.6);
            }
          }
        }

        // 4. Group ownership verification (EARLY, before spending AI credits)
        let creatorVerified = false;
        let creatorGroupId: string | null = null;
        let creatorGroupName: string | null = null;

        if (result.creatorType === 'Group' && creatorRobloxId && creatorGroupIds.has(result.creatorId)) {
          creatorVerified = true;
          matchReasons.push("creator_owns_group");
        } else if (result.creatorType === 'Group' && creatorRobloxId && groupsVerified < 30) {
          const groupInfo = await fetchCreatorGroupInfo(result.creatorId, result.creatorType);
          if (groupInfo) {
            creatorGroupId = groupInfo.groupId;
            creatorGroupName = groupInfo.groupName;
            if (creatorGroupIds.has(groupInfo.groupId)) {
              creatorVerified = true;
              matchReasons.push("creator_owns_group");
            }
            groupsVerified++;
            await new Promise(r => setTimeout(r, 300));
          }
        } else if (creatorRobloxId && result.creatorId === creatorRobloxId) {
          creatorVerified = true;
        }

        // If creator verified, skip entirely (no noise)
        if (creatorVerified) continue;

        let prelimScore = nameScore + descScore + dateScore;

        // ACCURACY FIX: Require meaningful name similarity as a gate
        // Without at least a partial name match, description/date signals alone are too noisy
        if (nameScore === 0) {
          // No name relevance at all — skip unless description is very strong (plagiarism)
          if (descScore < 20) continue;
        }

        // Raise minimum threshold from 20 to 25 to reduce noise
        if (prelimScore < 25 && matchReasons.length === 0) continue;

        // 5. AI Thumbnail comparison (only for promising candidates, capped)
        let thumbnailAnalyzed = false;
        let thumbnailUrl: string | null = null;
        if (originalThumbUrl && prelimScore >= 30 && thumbnailsAnalyzed < 20) {
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
              thumbScore = Math.min(aiResult.confidence, SCORE_CAPS.thumbnail);
            }
            logStep("AI thumbnail result", { universeId, ...aiResult });
          }
        }

        const totalScore = Math.min(nameScore + descScore + dateScore + thumbScore, 100);

        // Skip low-confidence detections (raised from 20 to 25)
        if (totalScore < 25) continue;

        // Track suspicious creators for deep scanning
        if (totalScore >= 40) {
          const key = `${result.creatorType}:${result.creatorId}`;
          const existing = suspiciousCreators.get(key);
          if (existing) {
            existing.matchCount++;
          } else {
            suspiciousCreators.set(key, { creatorType: result.creatorType, matchCount: 1 });
          }
        }

        // 6. Evidence collection for medium+ threats (uses pre-fetched details)
        let evidenceData: Record<string, unknown> = {};
        let evidenceScreenshots: string[] = [];
        let gameBadgesCount: number | null = null;
        let gamePassesCount: number | null = null;
        let gameFavorites: number | null = cachedDetails?.favorites || null;
        let gameVisits: number | null = cachedDetails?.visits || null;
        let gameGenre: string | null = cachedDetails?.genre || null;
        let evidenceCapturedAt: string | null = null;

        if (totalScore >= 30) {
          logStep("Collecting evidence", { universeId, score: totalScore });
          try {
            const evidence = await collectEvidence(universeId, result, entry.title, originalCreatedDate, cachedDetails);
            evidenceData = evidence.evidenceData;
            evidenceScreenshots = evidence.screenshots;
            gameBadgesCount = evidence.badgesCount;
            gamePassesCount = evidence.passesCount;
            gameFavorites = evidence.details?.favorites || gameFavorites;
            gameVisits = evidence.details?.visits || gameVisits;
            gameGenre = evidence.details?.genre || gameGenre;
            evidenceCapturedAt = new Date().toISOString();
            evidenceCollected++;
            await new Promise(r => setTimeout(r, 300));
          } catch (err) {
            logStep("Evidence collection error", { universeId, error: String(err) });
          }
        }

        // Player count trend
        const existingDet = existingMap.get(universeId);
        let playerCountTrend = 'stable';
        const previousPlayerCount = existingDet?.player_count || null;
        if (existingDet && previousPlayerCount !== null) {
          if (result.playerCount > previousPlayerCount * 1.2) playerCountTrend = 'rising';
          else if (result.playerCount < previousPlayerCount * 0.8) playerCountTrend = 'falling';
        }

        const detectionCount = existingDet ? (existingDet.detection_count || 1) + 1 : 1;

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
            similarity_score: totalScore,
            match_reasons: matchReasons,
            thumbnail_analyzed: thumbnailAnalyzed,
            thumbnail_url: thumbnailUrl,
            creator_verified: false,
            creator_group_id: creatorGroupId,
            creator_group_name: creatorGroupName,
            previous_player_count: previousPlayerCount,
            player_count_trend: playerCountTrend,
            detection_count: detectionCount,
            game_created_at: gameCreated,
            game_updated_at: gameUpdated,
            last_seen_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
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

          if (upsertData?.id) {
            await supabaseClient
              .from("ip_detection_snapshots")
              .insert({
                detection_id: upsertData.id,
                player_count: result.playerCount,
                similarity_score: totalScore,
              });
            snapshotsCreated++;
          }
        }
      }

      // ─── DEEP SCAN: Scan suspicious creators' other games ───
      if (suspiciousCreators.size > 0 && suspiciousCreatorsScanned < 10) {
        for (const [key, info] of suspiciousCreators) {
          if (suspiciousCreatorsScanned >= 10) break;
          if (info.matchCount < 2) continue;

          const [creatorType, creatorId] = key.split(':');
          logStep("Deep scanning suspicious creator", { creatorType, creatorId, matchCount: info.matchCount });

          await new Promise(r => setTimeout(r, 500));
          
          let creatorGames: SearchResult[] = [];
          if (creatorType === 'User') {
            creatorGames = await searchUserCreations(creatorId);
          } else if (creatorType === 'Group') {
            creatorGames = await searchGroupGames(creatorId);
          }

          suspiciousCreatorsScanned++;

          for (const game of creatorGames) {
            if (ownUniverseIds.has(game.universeId)) continue;
            if (allResults.has(game.universeId)) continue;

            const nameSim = computeNameSimilarity(entry.title, game.name);
            if (nameSim >= 40) {
              logStep("Suspicious creator has similar game", { universeId: game.universeId, name: game.name, similarity: nameSim });
              
              await supabaseClient
                .from("ip_copy_detections")
                .upsert({
                  registry_entry_id: entry.id,
                  creator_id: entry.creator_id,
                  search_keyword: `deep_scan:${creatorId}`,
                  detected_universe_id: game.universeId,
                  detected_place_id: game.placeId || null,
                  game_name: game.name,
                  game_creator_name: game.creatorName,
                  game_creator_id: game.creatorId,
                  game_creator_type: game.creatorType,
                  player_count: game.playerCount,
                  similarity_score: Math.min(Math.round(nameSim), 100),
                  match_reasons: [`suspicious_creator_game`, `name_match_${nameSim}%`],
                  thumbnail_analyzed: false,
                  creator_verified: false,
                  detection_count: 1,
                  game_created_at: game.created || null,
                  last_seen_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                }, {
                  onConflict: "registry_entry_id,detected_universe_id",
                  ignoreDuplicates: false,
                });
              totalDetected++;
            }
          }
        }
      }
    }

    logStep("Scan complete (v6)", { 
      totalSearches, totalDetected, thumbnailsAnalyzed, groupsVerified, 
      snapshotsCreated, evidenceCollected, suspiciousCreatorsScanned, genericSkipped 
    });

    return new Response(
      JSON.stringify({
        success: true,
        total_searches: totalSearches,
        total_detected: totalDetected,
        thumbnails_analyzed: thumbnailsAnalyzed,
        groups_verified: groupsVerified,
        snapshots_created: snapshotsCreated,
        evidence_collected: evidenceCollected,
        suspicious_creators_scanned: suspiciousCreatorsScanned,
        generic_skipped: genericSkipped,
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

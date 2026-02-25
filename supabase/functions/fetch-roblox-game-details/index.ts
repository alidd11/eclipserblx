import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function fetchJSON(url: string) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  return res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { universe_id, place_id, creator_type, creator_id } = await req.json();

    if (!universe_id) {
      return new Response(JSON.stringify({ error: "Missing universe_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all data in parallel
    const [
      gameDetailsRaw,
      thumbnailsRaw,
      gamePassesRaw,
      votesRaw,
      screenshotsRaw,
    ] = await Promise.all([
      // Game details (stats)
      fetchJSON(`https://games.roblox.com/v1/games?universeIds=${universe_id}`),
      // Game icon/thumbnail
      fetchJSON(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${universe_id}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`),
      // Game passes
      fetchJSON(`https://games.roblox.com/v1/games/${universe_id}/game-passes?limit=100&sortOrder=Asc`),
      // Votes
      fetchJSON(`https://games.roblox.com/v1/games/votes?universeIds=${universe_id}`),
      // Media (screenshots)
      fetchJSON(`https://games.roblox.com/v2/games/${universe_id}/media`),
    ]);

    const game = gameDetailsRaw?.data?.[0] || null;
    const thumbnail = thumbnailsRaw?.data?.[0]?.imageUrl || null;
    const votes = votesRaw?.data?.[0] || null;
    const gamePasses = (gamePassesRaw?.data || []).map((gp: any) => ({
      id: gp.id,
      name: gp.name,
      price: gp.price,
      displayName: gp.displayName,
    }));

    // Process screenshots/media
    const mediaItems = screenshotsRaw?.data || [];
    const imageAssetIds = mediaItems
      .filter((m: any) => m.assetTypeId === 1) // Images
      .map((m: any) => m.imageId);

    let screenshotUrls: string[] = [];
    if (imageAssetIds.length > 0) {
      // Fetch thumbnail URLs for screenshots
      const screenshotThumbsRaw = await fetchJSON(
        `https://thumbnails.roblox.com/v1/assets?assetIds=${imageAssetIds.join(",")}&returnPolicy=PlaceHolder&size=768x432&format=Png`
      );
      screenshotUrls = (screenshotThumbsRaw?.data || [])
        .filter((t: any) => t.state === "Completed")
        .map((t: any) => t.imageUrl);
    }

    // Video URLs from media
    const videos = mediaItems
      .filter((m: any) => m.assetTypeId === 33 || m.videoHash)
      .map((m: any) => ({
        videoHash: m.videoHash,
        title: m.videoTitle || null,
      }));

    // Fetch group owner avatar if creator is a group
    let groupOwner: any = null;
    const effectiveCreatorType = creator_type || game?.creator?.type;
    const effectiveCreatorId = creator_id || game?.creator?.id;

    if (effectiveCreatorType === "Group" && effectiveCreatorId) {
      const [groupInfoRaw, groupIconRaw] = await Promise.all([
        fetchJSON(`https://groups.roblox.com/v1/groups/${effectiveCreatorId}`),
        fetchJSON(`https://thumbnails.roblox.com/v1/groups/icons?groupIds=${effectiveCreatorId}&size=150x150&format=Png&isCircular=false`),
      ]);

      if (groupInfoRaw) {
        let ownerAvatar: string | null = null;
        if (groupInfoRaw.owner?.id) {
          const ownerAvatarRaw = await fetchJSON(
            `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${groupInfoRaw.owner.id}&size=150x150&format=Png&isCircular=true`
          );
          ownerAvatar = ownerAvatarRaw?.data?.[0]?.imageUrl || null;
        }

        groupOwner = {
          groupName: groupInfoRaw.name,
          groupDescription: groupInfoRaw.description,
          memberCount: groupInfoRaw.memberCount,
          groupIcon: groupIconRaw?.data?.[0]?.imageUrl || null,
          owner: groupInfoRaw.owner
            ? {
                id: groupInfoRaw.owner.id,
                username: groupInfoRaw.owner.username,
                displayName: groupInfoRaw.owner.displayName,
                avatar: ownerAvatar,
              }
            : null,
        };
      }
    }

    // If creator is a User, fetch their avatar
    let creatorAvatar: string | null = null;
    if ((effectiveCreatorType === "User") && effectiveCreatorId) {
      const avatarRaw = await fetchJSON(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${effectiveCreatorId}&size=150x150&format=Png&isCircular=true`
      );
      creatorAvatar = avatarRaw?.data?.[0]?.imageUrl || null;
    }

    const response = {
      game: game
        ? {
            name: game.name,
            description: game.description,
            playing: game.playing,
            visits: game.visits,
            maxPlayers: game.maxPlayers,
            created: game.created,
            updated: game.updated,
            favoritedCount: game.favoritedCount,
            genre: game.genre,
            creator: {
              type: game.creator?.type,
              id: game.creator?.id,
              name: game.creator?.name,
            },
          }
        : null,
      thumbnail,
      gamePasses,
      votes: votes
        ? { upVotes: votes.upVotes, downVotes: votes.downVotes }
        : null,
      screenshots: screenshotUrls,
      videos,
      groupOwner,
      creatorAvatar,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching game details:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

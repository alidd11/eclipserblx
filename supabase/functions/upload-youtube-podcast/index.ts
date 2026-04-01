import { handleCors, jsonOk, jsonError, unauthorized, internalError } from "../_shared/edge-response.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return unauthorized();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return unauthorized();

    // Admin check
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) return jsonError("Admin access required", 403);

    const body = await req.json();
    const { podcastId } = body;

    if (!podcastId) return jsonError("podcastId is required");

    // Get podcast record
    const { data: podcast, error: fetchErr } = await supabase
      .from("youtube_podcasts")
      .select("*")
      .eq("id", podcastId)
      .single();

    if (fetchErr || !podcast) return jsonError("Podcast not found", 404);

    // Get YouTube credentials
    const clientId = Deno.env.get("YOUTUBE_CLIENT_ID");
    const clientSecret = Deno.env.get("YOUTUBE_CLIENT_SECRET");
    const refreshToken = Deno.env.get("YOUTUBE_REFRESH_TOKEN");

    if (!clientId || !clientSecret || !refreshToken) {
      await supabase
        .from("youtube_podcasts")
        .update({ status: "failed", error_message: "YouTube API credentials not configured" })
        .eq("id", podcastId);
      return jsonError("YouTube API credentials not configured. Add YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, and YOUTUBE_REFRESH_TOKEN.", 500);
    }

    // Update status to uploading
    await supabase
      .from("youtube_podcasts")
      .update({ status: "uploading", error_message: null })
      .eq("id", podcastId);

    // Step 1: Get fresh access token using refresh token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!tokenRes.ok) {
      const tokenErr = await tokenRes.text();
      console.error("Token refresh failed:", tokenErr);
      await supabase
        .from("youtube_podcasts")
        .update({ status: "failed", error_message: `Token refresh failed: ${tokenErr}` })
        .eq("id", podcastId);
      return jsonError("Failed to refresh YouTube access token", 500);
    }

    const { access_token } = await tokenRes.json();

    // Step 2: Download the video file
    const videoRes = await fetch(podcast.video_file_url);
    if (!videoRes.ok) {
      await supabase
        .from("youtube_podcasts")
        .update({ status: "failed", error_message: "Failed to download video file" })
        .eq("id", podcastId);
      return jsonError("Failed to download video file", 500);
    }

    const videoBlob = await videoRes.blob();

    // Step 3: Resumable upload — initiate
    const metadata = {
      snippet: {
        title: podcast.title,
        description: podcast.description || "",
        tags: podcast.tags || [],
        categoryId: getCategoryId(podcast.category),
      },
      status: {
        privacyStatus: podcast.privacy_status || "public",
        selfDeclaredMadeForKids: false,
      },
    };

    const initRes = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Length": String(videoBlob.size),
          "X-Upload-Content-Type": videoBlob.type || "video/mp4",
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!initRes.ok) {
      const initErr = await initRes.text();
      console.error("Upload init failed:", initErr);
      await supabase
        .from("youtube_podcasts")
        .update({ status: "failed", error_message: `Upload init failed: ${initErr}` })
        .eq("id", podcastId);
      return jsonError("Failed to initiate YouTube upload", 500);
    }

    const uploadUrl = initRes.headers.get("Location");
    if (!uploadUrl) {
      await supabase
        .from("youtube_podcasts")
        .update({ status: "failed", error_message: "No upload URL returned" })
        .eq("id", podcastId);
      return jsonError("No upload URL from YouTube", 500);
    }

    // Step 4: Upload the video
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Length": String(videoBlob.size),
        "Content-Type": videoBlob.type || "video/mp4",
      },
      body: videoBlob,
    });

    if (!uploadRes.ok) {
      const uploadErr = await uploadRes.text();
      console.error("Video upload failed:", uploadErr);
      await supabase
        .from("youtube_podcasts")
        .update({ status: "failed", error_message: `Upload failed: ${uploadErr}` })
        .eq("id", podcastId);
      return jsonError("Failed to upload video to YouTube", 500);
    }

    const uploadData = await uploadRes.json();
    const videoId = uploadData.id;
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Step 5: Set thumbnail if provided
    if (podcast.thumbnail_url) {
      try {
        const thumbRes = await fetch(podcast.thumbnail_url);
        if (thumbRes.ok) {
          const thumbBlob = await thumbRes.blob();
          await fetch(
            `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${access_token}`,
                "Content-Type": thumbBlob.type || "image/jpeg",
              },
              body: thumbBlob,
            }
          );
        }
      } catch (thumbErr) {
        console.error("Thumbnail upload failed (non-critical):", thumbErr);
      }
    }

    // Step 6: Update record with success
    await supabase
      .from("youtube_podcasts")
      .update({
        status: "published",
        youtube_video_id: videoId,
        youtube_url: youtubeUrl,
        published_at: new Date().toISOString(),
      })
      .eq("id", podcastId);

    return jsonOk({ success: true, videoId, youtubeUrl });
  } catch (err) {
    return internalError(err);
  }
});

function getCategoryId(category: string | null): string {
  const map: Record<string, string> = {
    "Film & Animation": "1",
    "Autos & Vehicles": "2",
    Music: "10",
    "Pets & Animals": "15",
    Sports: "17",
    Gaming: "20",
    "People & Blogs": "22",
    Comedy: "23",
    Entertainment: "24",
    "News & Politics": "25",
    "Howto & Style": "26",
    Education: "27",
    "Science & Technology": "28",
    "Nonprofits & Activism": "29",
  };
  return map[category || "Education"] || "27";
}

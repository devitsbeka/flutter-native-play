import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// Default settings if database fetch fails
const DEFAULT_PROMPT = "The person gently smiles and looks around naturally with subtle head movements, blinking eyes, maintaining a friendly calm expression. Smooth natural animation.";
const DEFAULT_SETTINGS = {
  duration: 4,
  resolution: "720p",
  movement_amplitude: "small",
};

// Homepage scene idle-loop (mode "scene"): Kling v2.5 turbo pro animates the
// user's generated 16:9 scene into a seamlessly repeatable ambient video.
// The client passes the source-controlled prompt (src/config/
// sceneAnimationPrompt.ts); this copy is only the fallback.
const SCENE_LOOP_ENDPOINT = "https://queue.fal.run/fal-ai/kling-video/v2.5-turbo/pro/image-to-video";
const SCENE_LOOP_PROMPT = "Create a perfectly seamless, infinitely repeatable idle animation loop. The final frame must match the first frame exactly in composition, character pose, facial expression, camera position, lighting, object positions, and environment state, with no visible jump when repeated. Keep the scene calm and nearly still, with subtle premium-quality ambient animation only. The character remains seated in the same relaxed pose with gentle breathing, one subtle blink, and slight head micro-movement. Camera completely locked. All motion cyclic, returning to the exact starting state so the video repeats indefinitely with zero perceptible cut.";

async function fetchAnimationSettings(supabase: any): Promise<{ prompt: string; settings: typeof DEFAULT_SETTINGS }> {
  try {
    const { data, error } = await supabase
      .from('ai_generation_settings')
      .select('prompt, model_settings')
      .eq('setting_type', 'avatar_animation')
      .eq('is_active', true)
      .single();

    if (!error && data) {
      console.log("Using database settings for animation");
      const modelSettings = data.model_settings || {};
      return {
        prompt: data.prompt || DEFAULT_PROMPT,
        settings: {
          duration: modelSettings.duration || DEFAULT_SETTINGS.duration,
          resolution: modelSettings.resolution || DEFAULT_SETTINGS.resolution,
          movement_amplitude: modelSettings.movement_amplitude || DEFAULT_SETTINGS.movement_amplitude,
        },
      };
    }
    console.log("Using default animation settings, DB error:", error?.message);
  } catch (dbError) {
    console.log("Using default animation settings due to fetch error:", dbError);
  }
  return { prompt: DEFAULT_PROMPT, settings: DEFAULT_SETTINGS };
}

async function checkAndUpload(
  statusUrl: string,
  responseUrl: string,
  supabase: any,
  userId: string,
  falKey: string,
  mode?: string,
  sceneImageUrl?: string
): Promise<{ success: boolean; videoUrl?: string; error?: string }> {
  console.log("Checking Fal.ai status at:", statusUrl);
  
  const statusRes = await fetch(statusUrl, {
    headers: { Authorization: `Key ${falKey}` },
  });

  if (!statusRes.ok) {
    const errorText = await statusRes.text();
    console.error("Status check failed:", statusRes.status, errorText);
    throw new Error(`Status check failed: ${statusRes.status} - ${errorText}`);
  }

  const statusData = await statusRes.json();
  console.log("Status response:", JSON.stringify(statusData));

  if (statusData.status === "COMPLETED") {
    // Fetch the result
    const resultRes = await fetch(responseUrl, {
      headers: { Authorization: `Key ${falKey}` },
    });

    if (!resultRes.ok) {
      throw new Error(`Failed to get result: ${resultRes.status}`);
    }

    const resultData = await resultRes.json();
    console.log("Result data:", JSON.stringify(resultData));

    const videoUrl = resultData.video?.url;
    if (!videoUrl) {
      throw new Error("No video URL in result");
    }

    // Download video
    console.log("Downloading video from:", videoUrl);
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) {
      throw new Error(`Failed to download video: ${videoRes.status}`);
    }

    const videoBlob = await videoRes.blob();
    const videoArrayBuffer = await videoBlob.arrayBuffer();
    const videoUint8Array = new Uint8Array(videoArrayBuffer);

    // Upload to Supabase storage
    const fileName = mode === "scene"
      ? `${userId}/scene_loop_${Date.now()}.mp4`
      : `${userId}/animated_avatar_${Date.now()}.mp4`;
    console.log("Uploading to Supabase storage:", fileName);

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, videoUint8Array, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    const publicVideoUrl = publicUrlData.publicUrl;
    console.log("Public video URL:", publicVideoUrl);

    // Scene loop: attach the video to the scene's generation row — the
    // homepage prefers a scene's animated_avatar_url over its still image.
    // The profile's own avatar/animation fields are untouched.
    if (mode === "scene") {
      if (!sceneImageUrl) {
        throw new Error("Missing sceneImageUrl for scene loop result");
      }
      const { error: sceneError } = await supabase
        .from("avatar_generations")
        .update({ animated_avatar_url: publicVideoUrl })
        .eq("user_id", userId)
        .eq("avatar_url", sceneImageUrl);

      if (sceneError) {
        console.error("Scene generation update error:", sceneError);
        throw new Error(`Scene update failed: ${sceneError.message}`);
      }

      return { success: true, videoUrl: publicVideoUrl };
    }

    // Update profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ animated_avatar_url: publicVideoUrl })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Profile update error:", updateError);
      throw new Error(`Profile update failed: ${updateError.message}`);
    }

    // Also save the animated_avatar_url to the avatar_generations table
    // so it persists when user switches avatars and comes back
    const { data: currentAvatar } = await supabase
      .from("avatar_generations")
      .select("id")
      .eq("user_id", userId)
      .eq("is_current", true)
      .single();

    if (currentAvatar?.id) {
      const { error: generationError } = await supabase
        .from("avatar_generations")
        .update({ animated_avatar_url: publicVideoUrl })
        .eq("id", currentAvatar.id);

      if (generationError) {
        console.error("Avatar generation update error:", generationError);
        // Don't throw - profile is already updated, this is just for persistence
      }
    }

    return { success: true, videoUrl: publicVideoUrl };
  } else if (statusData.status === "FAILED") {
    throw new Error(`Video generation failed: ${statusData.error || "Unknown error"}`);
  }

  // Still processing
  return { success: false };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const falKey = Deno.env.get("FAL_KEY");
    if (!falKey) {
      throw new Error("FAL_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { imageUrl, userId, requestId, statusUrl, responseUrl, mode, promptOverride } = body;

    console.log("Request body:", JSON.stringify(body));

    // If we have statusUrl and responseUrl, we're polling for status
    if (statusUrl && responseUrl && userId) {
      console.log("Polling for status with URLs:", { statusUrl, responseUrl });
      const result = await checkAndUpload(statusUrl, responseUrl, supabase, userId, falKey, mode, imageUrl);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Otherwise, start a new animation request
    if (!imageUrl || !userId) {
      console.log("Missing required fields:", { imageUrl: !!imageUrl, userId: !!userId });
      throw new Error("Missing imageUrl or userId");
    }

    // Scene idle-loop: Kling v2.5 turbo pro over the user's homepage scene
    if (mode === "scene") {
      console.log("Starting scene loop with Kling for image:", imageUrl.substring(0, 100));
      const submitRes = await fetch(SCENE_LOOP_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Key ${falKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: promptOverride || SCENE_LOOP_PROMPT,
          image_url: imageUrl,
          duration: "5",
          negative_prompt: "blur, distort, low quality, camera movement, zoom, scene change",
          cfg_scale: 0.5,
        }),
      });

      if (!submitRes.ok) {
        const errorText = await submitRes.text();
        console.error("Kling submission failed:", submitRes.status, errorText);
        throw new Error(`Kling submission failed: ${submitRes.status} - ${errorText}`);
      }

      const submitData = await submitRes.json();
      console.log("Kling API response:", JSON.stringify(submitData));

      if (!submitData.request_id || !submitData.status_url || !submitData.response_url) {
        throw new Error("Missing request_id or URLs in Kling response");
      }

      return new Response(
        JSON.stringify({
          success: true,
          requestId: submitData.request_id,
          statusUrl: submitData.status_url,
          responseUrl: submitData.response_url,
          status: "processing",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Starting avatar animation with Fal.ai for image:", imageUrl.substring(0, 100));

    // Fetch settings from database
    const { prompt, settings } = await fetchAnimationSettings(supabase);

    // Submit to Fal.ai queue
    const submitRes = await fetch("https://queue.fal.run/fal-ai/vidu/q2/image-to-video/turbo", {
      method: "POST",
      headers: {
        Authorization: `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: prompt,
        image_url: imageUrl,
        duration: settings.duration,
        resolution: settings.resolution,
        movement_amplitude: settings.movement_amplitude,
      }),
    });

    if (!submitRes.ok) {
      const errorText = await submitRes.text();
      console.error("Fal.ai submission failed:", submitRes.status, errorText);
      throw new Error(`Fal.ai submission failed: ${submitRes.status} - ${errorText}`);
    }

    const submitData = await submitRes.json();
    console.log("Fal.ai API response:", JSON.stringify(submitData));

    const newRequestId = submitData.request_id;
    // Use the URLs provided by Fal.ai instead of constructing our own
    const newStatusUrl = submitData.status_url;
    const newResponseUrl = submitData.response_url;

    if (!newRequestId || !newStatusUrl || !newResponseUrl) {
      throw new Error("Missing request_id or URLs in Fal.ai response");
    }

    console.log("Returning request ID for polling:", newRequestId);

    return new Response(
      JSON.stringify({
        success: true,
        requestId: newRequestId,
        statusUrl: newStatusUrl,
        responseUrl: newResponseUrl,
        status: "processing",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error animating avatar:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

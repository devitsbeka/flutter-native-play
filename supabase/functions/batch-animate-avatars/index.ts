import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { getCorsHeaders } from "../_shared/cors.ts";

const VYRO_API_KEY = Deno.env.get('VYRO_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface VyroStatusResponse {
  status: string;
  result?: string;
  error?: string;
}

// Poll for video generation result
async function pollForResult(requestId: string, maxAttempts = 120): Promise<string> {
  const statusUrl = "https://api.vyro.ai/v2/video/status";
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    console.log(`Polling attempt ${attempt + 1}/${maxAttempts} for request ${requestId}`);
    
    const response = await fetch(`${statusUrl}?request_id=${requestId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${VYRO_API_KEY}`,
      },
    });

    if (!response.ok) {
      console.error("Status check failed:", response.status);
      throw new Error(`Status check failed: ${response.status}`);
    }

    const data: VyroStatusResponse = await response.json();
    console.log(`Status: ${data.status}`);

    if (data.status === "completed" && data.result) {
      console.log("Video generation completed!");
      return data.result;
    }

    if (data.status === "failed" || data.error) {
      throw new Error(`Video generation failed: ${data.error || 'Unknown error'}`);
    }

    // Wait 3 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  throw new Error("Polling timed out waiting for video generation");
}

// Download video and upload to Supabase storage
async function uploadToStorage(
  supabase: any, 
  videoUrl: string, 
  userId: string
): Promise<string> {
  console.log("Downloading video from:", videoUrl.substring(0, 100));
  
  const response = await fetch(videoUrl);
  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.status}`);
  }

  const videoBlob = await response.blob();
  const fileName = `${userId}/animated-avatar-${Date.now()}.mp4`;

  console.log("Uploading video to storage:", fileName);

  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(fileName, videoBlob, {
      contentType: 'video/mp4',
      upsert: true,
    });

  if (error) {
    console.error("Storage upload error:", error);
    throw new Error(`Failed to upload video: ${error.message}`);
  }

  const { data: publicUrl } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName);

  console.log("Video uploaded successfully:", publicUrl.publicUrl);
  return publicUrl.publicUrl;
}

// Animate a single avatar
async function animateAvatar(imageUrl: string): Promise<string> {
  console.log("Starting animation for:", imageUrl.substring(0, 100));

  // Fetch the image and create form data
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch source image: ${imageResponse.status}`);
  }
  const imageBlob = await imageResponse.blob();
  
  const formData = new FormData();
  formData.append("image", imageBlob, "avatar.png");
  formData.append("prompt", "The person gently smiles and looks around naturally with subtle head movements, blinking eyes, maintaining a friendly and calm expression. Smooth natural animation.");
  formData.append("negative_prompt", "sudden movements, distortion, morphing, unnatural expressions, glitches, artifacts");
  formData.append("style", "kling-1.0-pro");
  formData.append("aspect_ratio", "1:1");

  const response = await fetch("https://api.vyro.ai/v2/video/image-to-video", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${VYRO_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Vyro API error:", response.status, errorText);
    throw new Error(`Vyro API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log("Vyro API response:", JSON.stringify(data));

  // Check for request_id or id (Vyro uses 'id' for async requests)
  if (data.request_id || data.id) {
    const requestId = data.request_id || data.id;
    return await pollForResult(requestId);
  }

  if (data.result) {
    return data.result;
  }

  throw new Error("Unexpected response format from Vyro API: " + JSON.stringify(data));
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!VYRO_API_KEY) {
      throw new Error("VYRO_API_KEY is not configured");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get optional user IDs from request body
    let userIds: string[] | undefined;
    try {
      const body = await req.json();
      userIds = body.userIds;
    } catch {
      // No body provided, process all users
    }

    // Get all profiles with avatars but no animated avatar
    let query = supabase
      .from('profiles')
      .select('user_id, avatar_url, animated_avatar_url')
      .not('avatar_url', 'is', null)
      .is('animated_avatar_url', null);

    if (userIds && userIds.length > 0) {
      query = query.in('user_id', userIds);
    }

    const { data: profiles, error: fetchError } = await query.limit(10); // Process 10 at a time

    if (fetchError) {
      throw new Error(`Failed to fetch profiles: ${fetchError.message}`);
    }

    console.log(`Found ${profiles?.length || 0} profiles to animate`);

    const results: { userId: string; success: boolean; error?: string }[] = [];

    for (const profile of profiles || []) {
      try {
        console.log(`Processing user ${profile.user_id}`);
        
        // Generate animated avatar
        const videoUrl = await animateAvatar(profile.avatar_url);
        
        // Upload to storage
        const storedUrl = await uploadToStorage(supabase, videoUrl, profile.user_id);
        
        // Update profile with animated avatar URL
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ animated_avatar_url: storedUrl })
          .eq('user_id', profile.user_id);

        if (updateError) {
          throw new Error(`Failed to update profile: ${updateError.message}`);
        }

        results.push({ userId: profile.user_id, success: true });
        console.log(`Successfully animated avatar for user ${profile.user_id}`);
        
      } catch (error) {
        console.error(`Error processing user ${profile.user_id}:`, error);
        results.push({ 
          userId: profile.user_id, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${results.length} avatars. Success: ${successCount}, Failed: ${failCount}`,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in batch-animate-avatars:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

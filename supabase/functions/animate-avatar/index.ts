import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VYRO_API_KEY = Deno.env.get('VYRO_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface AnimateRequest {
  imageUrl: string;
  userId?: string;
  checkStatus?: boolean;
  requestId?: string;
}

interface VyroStatusResponse {
  status: string;
  result?: string;
  error?: string;
}

// Check status and upload if ready
async function checkAndUpload(requestId: string, userId: string): Promise<{ status: string; videoUrl?: string }> {
  const statusUrl = "https://api.vyro.ai/v2/video/status";
  
  console.log(`Checking status for request ${requestId}`);
  
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

  const data = await response.json();
  console.log(`Full status response:`, JSON.stringify(data));

  // Vyro API may return video URL directly in result field when completed
  // Status can be: processing, success (still processing), completed, or result may appear directly
  const videoResult = data.result || data.video_url || data.output;
  
  if (videoResult && typeof videoResult === 'string' && videoResult.startsWith('http')) {
    console.log("Video generation completed! URL:", videoResult.substring(0, 100));
    
    // Upload to storage
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      // Download video
      console.log("Downloading video...");
      const videoResponse = await fetch(videoResult);
      if (!videoResponse.ok) {
        throw new Error(`Failed to download video: ${videoResponse.status}`);
      }

      const videoBlob = await videoResponse.blob();
      const fileName = `${userId}/animated-avatar-${Date.now()}.mp4`;

      console.log("Uploading video to storage:", fileName);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, videoBlob, {
          contentType: 'video/mp4',
          upsert: true,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw new Error(`Failed to upload video: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const storedUrl = publicUrlData.publicUrl;
      console.log("Video uploaded successfully:", storedUrl);

      // Update user profile with animated avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ animated_avatar_url: storedUrl })
        .eq('user_id', userId);

      if (updateError) {
        console.error("Profile update error:", updateError);
      } else {
        console.log("Profile updated with animated avatar URL");
      }

      return { status: "completed", videoUrl: storedUrl };
    }
    
    return { status: "completed", videoUrl: videoResult };
  }

  // Check for failure
  if (data.status === "failed" || data.error) {
    throw new Error(`Video generation failed: ${data.error || 'Unknown error'}`);
  }

  // Still processing - return current status
  const currentStatus = data.status || "processing";
  console.log(`Still processing, status: ${currentStatus}`);
  return { status: currentStatus };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!VYRO_API_KEY) {
      throw new Error("VYRO_API_KEY is not configured");
    }

    const { imageUrl, userId, checkStatus, requestId }: AnimateRequest = await req.json();

    // If checking status of existing request
    if (checkStatus && requestId && userId) {
      const result = await checkAndUpload(requestId, userId);
      return new Response(
        JSON.stringify({ success: true, ...result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!imageUrl) {
      throw new Error("imageUrl is required");
    }

    console.log("Starting avatar animation for image:", imageUrl.substring(0, 100));

    // Create FormData for the request
    const formData = new FormData();
    
    // Fetch the image and add as blob
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch source image: ${imageResponse.status}`);
    }
    const imageBlob = await imageResponse.blob();
    formData.append("image", imageBlob, "avatar.png");
    
    // Animation prompt for subtle avatar movements
    formData.append("prompt", "The person gently smiles and looks around naturally with subtle head movements, blinking eyes, maintaining a friendly and calm expression. Smooth natural animation.");
    formData.append("negative_prompt", "sudden movements, distortion, morphing, unnatural expressions, glitches, artifacts");
    formData.append("style", "kling-1.0-pro");
    formData.append("aspect_ratio", "1:1");

    console.log("Sending request to Vyro API...");

    // Start video generation
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

    // Return request ID immediately - client will poll for status
    const generatedRequestId = data.request_id || data.id;
    if (generatedRequestId) {
      console.log("Returning request ID for polling:", generatedRequestId);
      return new Response(
        JSON.stringify({ 
          success: true, 
          status: "processing",
          requestId: generatedRequestId,
          message: "Video generation started. Please check status periodically."
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If result is returned directly (unlikely for video generation)
    if (data.result) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          status: "completed",
          videoUrl: data.result,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error("Unexpected response format from Vyro API: " + JSON.stringify(data));

  } catch (error) {
    console.error('Error animating avatar:', error);
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

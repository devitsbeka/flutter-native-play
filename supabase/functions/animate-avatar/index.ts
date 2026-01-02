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

// Check status using correct Vyro API endpoint
async function checkAndUpload(requestId: string, userId: string): Promise<{ status: string; videoUrl?: string }> {
  // Correct Vyro status endpoint: GET https://api.vyro.ai/v2/assets/{id}/status
  const statusUrl = `https://api.vyro.ai/v2/assets/${requestId}/status`;
  
  console.log(`Checking status at: ${statusUrl}`);
  
  const response = await fetch(statusUrl, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${VYRO_API_KEY}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Status check failed:", response.status, errorText);
    throw new Error(`Status check failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log(`Full status response:`, JSON.stringify(data));

  // Vyro API response format: {"status": "success", "video": {"status": "finished", "url": {"generation": "<video-url>"}}}
  if (data.status === "success" && data.video) {
    const videoStatus = data.video.status;
    
    if (videoStatus === "finished" && data.video.url?.generation) {
      const videoUrl = data.video.url.generation;
      console.log("Video generation completed! URL:", videoUrl.substring(0, 100));
      
      // Upload to storage
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && userId) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        // Download video
        console.log("Downloading video...");
        const videoResponse = await fetch(videoUrl);
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
      
      return { status: "completed", videoUrl: videoUrl };
    }
    
    // Video still processing
    if (videoStatus === "processing" || videoStatus === "pending" || videoStatus === "queued") {
      console.log(`Video still processing, status: ${videoStatus}`);
      return { status: "processing" };
    }
    
    // Video failed
    if (videoStatus === "failed" || videoStatus === "error") {
      throw new Error(`Video generation failed with status: ${videoStatus}`);
    }
  }

  // Check for error response
  if (data.status === "error" || data.error) {
    throw new Error(`Video generation failed: ${data.error || data.message || 'Unknown error'}`);
  }

  // Default to processing if we can't determine status
  console.log(`Unknown status format, assuming still processing:`, JSON.stringify(data));
  return { status: "processing" };
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

    // Fetch the image first - Vyro requires the actual file
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch source image: ${imageResponse.status}`);
    }
    const imageBlob = await imageResponse.blob();

    // Create FormData for the request - Vyro expects "file" field for image upload
    const formData = new FormData();
    formData.append("file", imageBlob, "avatar.png");
    
    // Animation prompt for subtle avatar movements
    formData.append("prompt", "The person gently smiles and looks around naturally with subtle head movements, blinking eyes, maintaining a friendly and calm expression. Smooth natural animation.");
    
    // Correct style parameter for Vyro API: "veo-2"
    formData.append("style", "veo-2");

    console.log("Sending request to Vyro API with style: veo-2");

    // Start video generation: POST https://api.vyro.ai/v2/video/image-to-video
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

    // Response format: {"id": "<video-id>", "status": "processing"}
    const generatedRequestId = data.id;
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

    throw new Error("No request ID returned from Vyro API: " + JSON.stringify(data));

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

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
}

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

    // Wait 3 seconds before next poll (video generation takes time)
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!VYRO_API_KEY) {
      throw new Error("VYRO_API_KEY is not configured");
    }

    const { imageUrl, userId }: AnimateRequest = await req.json();

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
    formData.append("duration", "3"); // 3 seconds
    formData.append("aspect_ratio", "1:1"); // Square for avatar
    formData.append("style", "realistic");

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

    // Check if we got a request_id for async processing
    if (data.request_id) {
      console.log("Got request_id, polling for result:", data.request_id);
      const videoUrl = await pollForResult(data.request_id);
      
      // If userId provided, upload to storage
      if (userId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const storedUrl = await uploadToStorage(supabase, videoUrl, userId);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            videoUrl: storedUrl,
            originalUrl: videoUrl,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          videoUrl: videoUrl,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If result is returned directly
    if (data.result) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          videoUrl: data.result,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error("Unexpected response format from Vyro API");

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

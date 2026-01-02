import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FAL_KEY = Deno.env.get('FAL_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const FAL_API_URL = "https://queue.fal.run/fal-ai/vidu/q2/image-to-video/turbo";

interface AnimateRequest {
  imageUrl: string;
  userId?: string;
  checkStatus?: boolean;
  requestId?: string;
}

// Check status and upload when complete
async function checkAndUpload(requestId: string, userId: string): Promise<{ status: string; videoUrl?: string }> {
  const statusUrl = `${FAL_API_URL}/requests/${requestId}/status`;
  
  console.log(`Checking Fal.ai status at: ${statusUrl}`);
  
  const response = await fetch(statusUrl, {
    method: "GET",
    headers: {
      "Authorization": `Key ${FAL_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Status check failed:", response.status, errorText);
    throw new Error(`Status check failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log(`Fal.ai status response:`, JSON.stringify(data));

  // Fal.ai status: IN_QUEUE, IN_PROGRESS, COMPLETED, FAILED
  if (data.status === "COMPLETED") {
    // Fetch the result
    const resultUrl = `${FAL_API_URL}/requests/${requestId}`;
    const resultResponse = await fetch(resultUrl, {
      method: "GET",
      headers: {
        "Authorization": `Key ${FAL_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!resultResponse.ok) {
      const errorText = await resultResponse.text();
      throw new Error(`Failed to fetch result: ${resultResponse.status} - ${errorText}`);
    }

    const result = await resultResponse.json();
    console.log(`Fal.ai result:`, JSON.stringify(result));

    const videoUrl = result.video?.url;
    if (!videoUrl) {
      throw new Error("No video URL in completed result");
    }

    console.log("Video generation completed! URL:", videoUrl.substring(0, 100));
    
    // Upload to storage
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && userId) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      // Download video
      console.log("Downloading video from Fal.ai...");
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
  
  if (data.status === "IN_QUEUE" || data.status === "IN_PROGRESS") {
    console.log(`Video still processing, status: ${data.status}`);
    return { status: "processing" };
  }
  
  if (data.status === "FAILED") {
    throw new Error(`Video generation failed: ${data.error || 'Unknown error'}`);
  }

  // Default to processing if we can't determine status
  console.log(`Unknown status: ${data.status}, assuming still processing`);
  return { status: "processing" };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!FAL_KEY) {
      throw new Error("FAL_KEY is not configured");
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

    console.log("Starting avatar animation with Fal.ai for image:", imageUrl.substring(0, 100));

    // Submit to Fal.ai queue
    const response = await fetch(FAL_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Key ${FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: imageUrl,
        prompt: "The person gently smiles and looks around naturally with subtle head movements, blinking eyes, maintaining a friendly calm expression. Smooth natural animation.",
        duration: "4",
        resolution: "720p",
        movement_amplitude: "small",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Fal.ai API error:", response.status, errorText);
      throw new Error(`Fal.ai API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("Fal.ai API response:", JSON.stringify(data));

    // Fal.ai returns request_id for queued requests
    const generatedRequestId = data.request_id;
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

    throw new Error("No request ID returned from Fal.ai API: " + JSON.stringify(data));

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

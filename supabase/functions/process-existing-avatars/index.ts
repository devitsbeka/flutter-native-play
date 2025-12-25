import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LIGHTX_API_KEY = Deno.env.get('LIGHTX_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface LightXResultResponse {
  statusCode: number;
  body: {
    status: string;
    output?: string;
    error?: string;
  };
}

async function pollForResult(orderId: string, maxAttempts = 60): Promise<string> {
  const pollUrl = "https://api.lightxeditor.com/external/api/v1/order-status";
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    console.log(`Polling attempt ${attempt + 1} for order ${orderId}`);
    
    const response = await fetch(pollUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": LIGHTX_API_KEY!,
      },
      body: JSON.stringify({ orderId }),
    });

    const data: LightXResultResponse = await response.json();
    console.log(`Poll response status: ${data.body?.status}`);

    if (data.body?.status === "completed" || data.body?.status === "active") {
      if (data.body.output) {
        return data.body.output;
      }
      throw new Error("No output URL in completed response");
    }

    if (data.body?.status === "failed") {
      throw new Error(data.body.error || "Operation failed");
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new Error("Operation timed out");
}

async function removeBackground(imageUrl: string): Promise<string> {
  console.log("Starting background removal for:", imageUrl);
  
  const response = await fetch("https://api.lightxeditor.com/external/api/v1/remove-background", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": LIGHTX_API_KEY!,
    },
    body: JSON.stringify({
      imageUrl: imageUrl,
    }),
  });

  const data = await response.json();
  console.log("LightX remove-bg response:", JSON.stringify(data));

  if (!response.ok || (data.statusCode && data.statusCode !== 2000)) {
    throw new Error(`LightX remove-bg API error: ${data.message || JSON.stringify(data)}`);
  }

  const orderId = data.body?.orderId || data.orderId;
  if (!orderId) {
    throw new Error(`No orderId in remove-bg response: ${JSON.stringify(data)}`);
  }

  console.log("Background removal orderId:", orderId);
  const resultUrl = await pollForResult(orderId);
  console.log("Background removed successfully:", resultUrl);

  return resultUrl;
}

async function downloadAndUpload(
  supabase: any,
  imageUrl: string,
  userId: string
): Promise<string> {
  // Download the image from LightX
  console.log("Downloading processed image from:", imageUrl);
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error("Failed to download processed image");
  }
  
  const imageBlob = await imageResponse.blob();
  const arrayBuffer = await imageBlob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  // Upload to Supabase storage with .png extension for transparency
  const fileName = `avatar_nobg_${Date.now()}.png`;
  const filePath = `${userId}/${fileName}`;
  
  console.log("Uploading to Supabase storage:", filePath);
  
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, uint8Array, {
      contentType: 'image/png',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!LIGHTX_API_KEY) {
      throw new Error("LIGHTX_API_KEY is not configured");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all profiles with avatars
    const { data: profiles, error: fetchError } = await supabase
      .from('profiles')
      .select('id, user_id, avatar_url')
      .not('avatar_url', 'is', null);

    if (fetchError) {
      throw new Error(`Failed to fetch profiles: ${fetchError.message}`);
    }

    console.log(`Found ${profiles?.length || 0} profiles with avatars`);

    const results: { userId: string; success: boolean; error?: string; newUrl?: string }[] = [];

    for (const profile of profiles || []) {
      console.log(`\n--- Processing user ${profile.user_id} ---`);
      
      try {
        // Skip if already processed (has _nobg_ in filename)
        if (profile.avatar_url.includes('_nobg_')) {
          console.log("Already processed, skipping");
          results.push({ userId: profile.user_id, success: true, newUrl: profile.avatar_url });
          continue;
        }

        // Remove background
        const processedUrl = await removeBackground(profile.avatar_url);
        
        // Download and upload to our storage
        const newAvatarUrl = await downloadAndUpload(supabase, processedUrl, profile.user_id);
        
        // Update profile
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: newAvatarUrl })
          .eq('user_id', profile.user_id);

        if (updateError) {
          throw new Error(`Failed to update profile: ${updateError.message}`);
        }

        console.log(`Successfully processed avatar for user ${profile.user_id}`);
        results.push({ userId: profile.user_id, success: true, newUrl: newAvatarUrl });

      } catch (error) {
        console.error(`Error processing user ${profile.user_id}:`, error);
        results.push({ 
          userId: profile.user_id, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }

      // Small delay between users to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Processed ${results.length} avatars: ${successCount} succeeded, ${failCount} failed`,
        results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error processing avatars:', error);
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
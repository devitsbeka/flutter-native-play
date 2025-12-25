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

// Style reference image - 3D Pixar style avatar
const styleImageUrl = "https://mytrivia.io/images/avatar-style-reference.jpg";

async function expandImage(imageUrl: string, padding: number = 150): Promise<string> {
  console.log("Expanding image by", padding, "px (top, left, right) for:", imageUrl.substring(0, 100));
  
  const response = await fetch("https://api.lightxeditor.com/external/api/v2/expand-photo", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": LIGHTX_API_KEY!,
    },
    body: JSON.stringify({
      imageUrl: imageUrl,
      topPadding: padding,
      bottomPadding: 0,
      leftPadding: padding,
      rightPadding: padding,
    }),
  });

  const data = await response.json();
  console.log("LightX expand response:", JSON.stringify(data));

  if (!response.ok || (data.statusCode && data.statusCode !== 2000)) {
    throw new Error(`LightX expand API error: ${data.message || JSON.stringify(data)}`);
  }

  const orderId = data.body?.orderId || data.orderId;
  if (!orderId) {
    throw new Error(`No orderId in expand response: ${JSON.stringify(data)}`);
  }

  console.log("Expand orderId:", orderId);

  // Poll for the result
  const resultUrl = await pollForResult(orderId);
  console.log("Image expanded successfully:", resultUrl);

  return resultUrl;
}

async function regenerateAvatar(originalImageUrl: string): Promise<string> {
  console.log("Starting avatar regeneration for:", originalImageUrl);
  
  // Step 1: Generate new avatar with improved prompt using avatar endpoint
  const response = await fetch("https://api.lightxeditor.com/external/api/v1/avatar", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": LIGHTX_API_KEY!,
    },
    body: JSON.stringify({
      imageUrl: originalImageUrl,
      styleImageUrl: styleImageUrl,
      textPrompt: "animated person in a hoodie with a big smile on his face, appears to be from the Disney Pixar movie, 3D cartoon, hyper-detailed,HD,HDR,4K,8K.",
      styleStrength: 100,
    }),
  });

  const data = await response.json();
  console.log("LightX avatar response:", JSON.stringify(data));

  if (!response.ok || (data.statusCode && data.statusCode !== 2000)) {
    throw new Error(`LightX avatar API error: ${data.message || JSON.stringify(data)}`);
  }

  const orderId = data.body?.orderId || data.orderId;
  if (!orderId) {
    throw new Error(`No orderId in response: ${JSON.stringify(data)}`);
  }

  console.log("Avatar generation orderId:", orderId);
  const avatarUrl = await pollForResult(orderId);
  console.log("Avatar generated successfully:", avatarUrl);

  // Step 2: Expand image (top, left, right by 150px) (REQUIRED)
  console.log("Step 2: Expanding avatar (top, left, right by 150px)...");
  const expandedUrl = await expandImage(avatarUrl, 150);
  console.log("Avatar expanded successfully:", expandedUrl);

  // Step 3: Remove background
  console.log("Starting background removal...");
  const bgResponse = await fetch("https://api.lightxeditor.com/external/api/v1/remove-background", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": LIGHTX_API_KEY!,
    },
    body: JSON.stringify({
      imageUrl: expandedUrl,
    }),
  });

  const bgData = await bgResponse.json();
  console.log("LightX remove-bg response:", JSON.stringify(bgData));

  if (!bgResponse.ok || (bgData.statusCode && bgData.statusCode !== 2000)) {
    throw new Error(`LightX remove-bg API error: ${bgData.message || JSON.stringify(bgData)}`);
  }

  const bgOrderId = bgData.body?.orderId || bgData.orderId;
  if (!bgOrderId) {
    throw new Error(`No orderId in remove-bg response: ${JSON.stringify(bgData)}`);
  }

  console.log("Background removal orderId:", bgOrderId);
  const finalUrl = await pollForResult(bgOrderId);
  console.log("Background removed successfully:", finalUrl);

  return finalUrl;
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
  
  // Upload to Supabase storage with unique filename
  const fileName = `avatar_regen_${Date.now()}.png`;
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

// Store original avatar URLs in storage for regeneration
async function getOriginalAvatarUrl(supabase: any, userId: string, currentUrl: string): Promise<string | null> {
  // Check if we have an original stored
  const { data: files } = await supabase.storage
    .from('avatars')
    .list(userId, { search: 'original_' });
  
  if (files && files.length > 0) {
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(`${userId}/${files[0].name}`);
    return urlData.publicUrl;
  }
  
  // If the current URL doesn't contain regen or nobg, it's likely the original
  if (!currentUrl.includes('_regen_') && !currentUrl.includes('_nobg_')) {
    return currentUrl;
  }
  
  // Try to find any non-processed image
  const { data: allFiles } = await supabase.storage
    .from('avatars')
    .list(userId);
  
  if (allFiles) {
    for (const file of allFiles) {
      if (!file.name.includes('_regen_') && !file.name.includes('_nobg_')) {
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(`${userId}/${file.name}`);
        return urlData.publicUrl;
      }
    }
  }
  
  // Fallback: use current URL and hope for the best
  return currentUrl;
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

    // Parse request body for optional user_ids filter
    let userIds: string[] = [];
    try {
      const body = await req.json();
      if (body.user_ids && Array.isArray(body.user_ids)) {
        userIds = body.user_ids;
      }
    } catch {
      // No body or invalid JSON, process all users
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch profiles with avatars, optionally filtered by user_ids
    let query = supabase
      .from('profiles')
      .select('id, user_id, avatar_url')
      .not('avatar_url', 'is', null);
    
    if (userIds.length > 0) {
      query = query.in('user_id', userIds);
    }

    const { data: profiles, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch profiles: ${fetchError.message}`);
    }

    console.log(`Found ${profiles?.length || 0} profiles to process`);

    const results: { userId: string; success: boolean; error?: string; newUrl?: string }[] = [];

    for (const profile of profiles || []) {
      console.log(`\n--- Processing user ${profile.user_id} ---`);
      
      try {
        // Get original avatar URL for regeneration
        const originalUrl = await getOriginalAvatarUrl(supabase, profile.user_id, profile.avatar_url);
        
        if (!originalUrl) {
          console.log("No original avatar found, skipping");
          results.push({ userId: profile.user_id, success: false, error: "No original avatar found" });
          continue;
        }

        console.log("Using original URL for regeneration:", originalUrl);

        // Regenerate avatar with new prompt + expand + remove background
        const processedUrl = await regenerateAvatar(originalUrl);
        
        // Download and upload to our storage
        const newAvatarUrl = await downloadAndUpload(supabase, processedUrl, profile.user_id);
        
        // Update profile - this will trigger realtime update
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: newAvatarUrl })
          .eq('user_id', profile.user_id);

        if (updateError) {
          throw new Error(`Failed to update profile: ${updateError.message}`);
        }

        console.log(`Successfully regenerated avatar for user ${profile.user_id}`);
        results.push({ userId: profile.user_id, success: true, newUrl: newAvatarUrl });

      } catch (error) {
        console.error(`Error processing user ${profile.user_id}:`, error);
        results.push({ 
          userId: profile.user_id, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }

      // Delay between users to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Regenerated ${results.length} avatars: ${successCount} succeeded, ${failCount} failed`,
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

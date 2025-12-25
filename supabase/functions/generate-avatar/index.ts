import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LIGHTX_API_KEY = Deno.env.get('LIGHTX_API_KEY');

// Style reference image URL - use the production app URL
const getStyleImageUrl = () => {
  // This image is stored in the public folder
  return "https://mytrivia.io/images/avatar-style-reference.jpg";
};

interface AvatarRequest {
  imageUrl: string;
}

interface LightXResponse {
  statusCode: number;
  body: {
    orderId: string;
    status: string;
  };
}

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

    // Wait 2 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new Error("Operation timed out");
}

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

async function removeBackground(imageUrl: string): Promise<string> {
  console.log("Starting background removal for:", imageUrl.substring(0, 100));
  
  // Call LightX Remove Background API - no background color for transparency
  const response = await fetch("https://api.lightxeditor.com/external/api/v1/remove-background", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": LIGHTX_API_KEY!,
    },
    body: JSON.stringify({
      imageUrl: imageUrl,
      // Omit background to get transparent PNG
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

  // Poll for the result
  const resultUrl = await pollForResult(orderId);
  console.log("Background removed successfully:", resultUrl);

  return resultUrl;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!LIGHTX_API_KEY) {
      throw new Error("LIGHTX_API_KEY is not configured");
    }

    const { imageUrl }: AvatarRequest = await req.json();

    if (!imageUrl) {
      throw new Error("imageUrl is required");
    }

    console.log("Starting avatar generation for image:", imageUrl.substring(0, 100));
    const styleImageUrl = getStyleImageUrl();
    console.log("Using style reference:", styleImageUrl);

    // Step 1: Call LightX Avatar API with style reference
    const response = await fetch("https://api.lightxeditor.com/external/api/v1/avatar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": LIGHTX_API_KEY,
      },
      body: JSON.stringify({
        imageUrl: imageUrl,
        styleImageUrl: styleImageUrl,
        textPrompt: "animated person in a hoodie with a big smile on his face, appears to be from the Disney Pixar movie, 3D cartoon, hyper-detailed,HD,HDR,4K,8K.",
        styleStrength: 100,
      }),
    });

    const data = await response.json();
    console.log("LightX initial response:", JSON.stringify(data));

    // Check for API error response - statusCode 2000 means success
    if (!response.ok || (data.statusCode && data.statusCode !== 2000)) {
      throw new Error(`LightX API error: ${data.message || JSON.stringify(data)}`);
    }

    // Handle response structure
    const orderId = data.body?.orderId || data.orderId;
    if (!orderId) {
      throw new Error(`No orderId in response: ${JSON.stringify(data)}`);
    }
    
    console.log("Got orderId:", orderId);

    // Poll for the avatar generation result
    const avatarUrl = await pollForResult(orderId);
    console.log("Avatar generated successfully:", avatarUrl);

    // Step 2: Remove background FIRST (before any expansion)
    console.log("Step 2: Removing background from avatar...");
    const transparentAvatarUrl = await removeBackground(avatarUrl);
    console.log("Avatar with transparent background:", transparentAvatarUrl);

    // Note: Skipping expand step - LightX expand adds AI-generated content WITH background,
    // which doesn't work well with transparent avatars. The transparent avatar is the final result.

    return new Response(
      JSON.stringify({ 
        success: true, 
        avatarUrl: transparentAvatarUrl,
        originalAvatarUrl: avatarUrl,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error generating avatar:', error);
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

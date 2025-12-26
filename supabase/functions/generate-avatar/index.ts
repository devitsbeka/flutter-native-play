import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LIGHTX_API_KEY = Deno.env.get('LIGHTX_API_KEY');

interface AvatarRequest {
  imageUrl: string;
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

async function removeBackground(imageUrl: string): Promise<string> {
  console.log("Starting background removal for:", imageUrl.substring(0, 100));
  
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

serve(async (req) => {
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

    // Step 1: Generate avatar with prompt only (no style image)
    const response = await fetch("https://api.lightxeditor.com/external/api/v1/avatar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": LIGHTX_API_KEY,
      },
      body: JSON.stringify({
        imageUrl: imageUrl,
        textPrompt: "High quality 3D cartoon avatar, Disney Pixar animation style, friendly welcoming expression, soft studio lighting, vibrant colors, detailed facial features, smooth skin texture, expressive eyes, full head and shoulders visible with extra space around head, centered composition",
        styleStrength: 50,
      }),
    });

    const data = await response.json();
    console.log("LightX avatar response:", JSON.stringify(data));

    if (!response.ok || (data.statusCode && data.statusCode !== 2000)) {
      throw new Error(`LightX API error: ${data.message || JSON.stringify(data)}`);
    }

    const orderId = data.body?.orderId || data.orderId;
    if (!orderId) {
      throw new Error(`No orderId in response: ${JSON.stringify(data)}`);
    }
    
    console.log("Got orderId:", orderId);

    // Poll for the avatar generation result
    const avatarUrl = await pollForResult(orderId);
    console.log("Avatar generated successfully:", avatarUrl);

    // Step 2: Remove background
    console.log("Step 2: Removing background...");
    const finalAvatarUrl = await removeBackground(avatarUrl);
    console.log("Final avatar with transparent background:", finalAvatarUrl);

    return new Response(
      JSON.stringify({ 
        success: true, 
        avatarUrl: finalAvatarUrl,
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

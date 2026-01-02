import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STABILITY_API_KEY = Deno.env.get('STABILITY_API_KEY');

interface AvatarRequest {
  imageUrl: string;
}

async function fetchImageAsBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  return await response.blob();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!STABILITY_API_KEY) {
      throw new Error("STABILITY_API_KEY is not configured");
    }

    const { imageUrl }: AvatarRequest = await req.json();

    if (!imageUrl) {
      throw new Error("imageUrl is required");
    }

    console.log("Starting avatar generation with Stability AI for image:", imageUrl.substring(0, 100));

    // Fetch the source image
    const imageBlob = await fetchImageAsBlob(imageUrl);
    console.log("Fetched source image, size:", imageBlob.size);

    // Create form data for Stability AI
    const formData = new FormData();
    formData.append("image", imageBlob, "source.png");
    formData.append("prompt", "Cute adorable 3D Pixar Disney cartoon character portrait, big expressive shiny cartoon eyes with sparkle catchlights, smooth soft matte cartoon skin, cute rounded facial features, stylized cartoon hair with volume, sweet friendly expression, soft violet and pink accent lighting on hair and face edges, dark navy gradient background, Pixar Disney animation quality, charming lovable character design, high quality 3D render");
    formData.append("mode", "image-to-image");
    formData.append("strength", "0.7");
    formData.append("model", "sd3-large"); // Use sd3-large which supports image-to-image properly
    formData.append("output_format", "png");
    formData.append("negative_prompt", "realistic, photo, photograph, ugly, deformed, noisy, blurry, low quality, distorted face, bad anatomy");

    // Call Stability AI SD3 image-to-image endpoint
    const response = await fetch("https://api.stability.ai/v2beta/stable-image/generate/sd3", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${STABILITY_API_KEY}`,
        "Accept": "application/json",
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Stability AI error response:", response.status, errorText);
      throw new Error(`Stability AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("Stability AI response received");

    // The response contains base64 encoded image
    if (!data.image) {
      console.error("Unexpected response format:", JSON.stringify(data));
      throw new Error("No image in response");
    }

    // Return the base64 image as a data URL
    const avatarUrl = `data:image/png;base64,${data.image}`;
    console.log("Avatar generated successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        avatarUrl: avatarUrl,
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

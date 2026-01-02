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
    console.log("Fetched source image, size:", imageBlob.size, "type:", imageBlob.type);

    // Create form data for Stability AI Creative Upscale (more reliable for transformations)
    const formData = new FormData();
    formData.append("image", imageBlob, "source.png");
    formData.append("prompt", "3D Pixar Disney cartoon character portrait, big expressive shiny cartoon eyes, smooth soft matte cartoon skin, cute rounded facial features, stylized cartoon hair, sweet friendly expression, soft violet and pink lighting, dark navy gradient background, high quality 3D render, charming character design");
    formData.append("output_format", "png");

    // Try the image-to-image endpoint with a simpler approach
    const response = await fetch("https://api.stability.ai/v2beta/stable-image/control/sketch", {
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
      
      // If sketch endpoint fails, try structure endpoint
      console.log("Trying structure endpoint instead...");
      
      const formData2 = new FormData();
      formData2.append("image", imageBlob, "source.png");
      formData2.append("prompt", "3D Pixar Disney cartoon character portrait, big expressive shiny cartoon eyes, smooth soft matte cartoon skin, cute rounded facial features, stylized cartoon hair, sweet friendly expression, soft violet and pink lighting, dark navy gradient background, high quality 3D render");
      formData2.append("control_strength", "0.6");
      formData2.append("output_format", "png");

      const response2 = await fetch("https://api.stability.ai/v2beta/stable-image/control/structure", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${STABILITY_API_KEY}`,
          "Accept": "application/json",
        },
        body: formData2,
      });

      if (!response2.ok) {
        const errorText2 = await response2.text();
        console.error("Structure endpoint also failed:", response2.status, errorText2);
        throw new Error(`Stability AI API error: ${response2.status} - ${errorText2}`);
      }

      const data2 = await response2.json();
      if (!data2.image) {
        throw new Error("No image in response");
      }

      const avatarUrl = `data:image/png;base64,${data2.image}`;
      console.log("Avatar generated successfully via structure endpoint");

      return new Response(
        JSON.stringify({ 
          success: true, 
          avatarUrl: avatarUrl,
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data = await response.json();
    console.log("Stability AI response received");

    if (!data.image) {
      console.error("Unexpected response format:", JSON.stringify(data));
      throw new Error("No image in response");
    }

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

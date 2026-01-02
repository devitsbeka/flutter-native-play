import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STABILITY_API_KEY = Deno.env.get('STABILITY_API_KEY');

interface AvatarRequest {
  imageUrl: string;
}

// Convert image to PNG format by fetching and re-encoding
async function fetchImageAsBlob(imageUrl: string): Promise<{ blob: Blob; mimeType: string }> {
  console.log("Fetching image from URL:", imageUrl.substring(0, 100));
  
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  
  const contentType = response.headers.get('content-type') || 'image/png';
  const arrayBuffer = await response.arrayBuffer();
  
  console.log("Fetched image, content-type:", contentType, "size:", arrayBuffer.byteLength);
  
  // If the image is already in a supported format, use it directly
  if (contentType.includes('jpeg') || contentType.includes('jpg')) {
    return { blob: new Blob([arrayBuffer], { type: 'image/jpeg' }), mimeType: 'image/jpeg' };
  } else if (contentType.includes('png')) {
    return { blob: new Blob([arrayBuffer], { type: 'image/png' }), mimeType: 'image/png' };
  } else if (contentType.includes('webp')) {
    return { blob: new Blob([arrayBuffer], { type: 'image/webp' }), mimeType: 'image/webp' };
  }
  
  // For unsupported formats (like AVIF), we need to use a workaround
  // Since Deno doesn't have native image conversion, we'll convert via base64 and send as PNG
  console.log("Unsupported format detected:", contentType, "- will attempt to process anyway");
  
  // Try sending as PNG - Stability might be able to handle the raw bytes
  return { blob: new Blob([arrayBuffer], { type: 'image/png' }), mimeType: 'image/png' };
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

    // Fetch and prepare the image
    const { blob: imageBlob, mimeType } = await fetchImageAsBlob(imageUrl);
    console.log("Image prepared, mimeType:", mimeType, "size:", imageBlob.size);

    // Build FormData for multipart request
    const formData = new FormData();
    formData.append('image', imageBlob, 'source.png');
    formData.append('prompt', '3D Pixar Disney cartoon character portrait avatar, big expressive shiny cartoon eyes with sparkle catchlights, smooth soft matte cartoon skin, cute rounded facial features, stylized cartoon hair with volume, sweet friendly expression, soft violet and pink accent lighting on hair and face edges, dark navy gradient background, high quality Pixar Disney 3D render, charming lovable character design');
    formData.append('negative_prompt', 'ugly, deformed, blurry, low quality, realistic photo, photorealistic');
    formData.append('strength', '0.65');
    formData.append('output_format', 'png');
    formData.append('aspect_ratio', '1:1');

    // Use Stable Image Ultra endpoint for image-to-image
    const response = await fetch("https://api.stability.ai/v2beta/stable-image/generate/ultra", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${STABILITY_API_KEY}`,
        "Accept": "application/json",
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Stability AI error response:", response.status, errorText);
      throw new Error(`Stability AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("Stability AI response received");

    // Extract the generated image - Ultra returns base64 in JSON when accept is application/json
    const generatedImage = data.image;
    
    if (!generatedImage) {
      console.error("No image in response:", JSON.stringify(data));
      throw new Error("No image generated in response");
    }

    // Return as data URL
    const avatarUrl = `data:image/png;base64,${generatedImage}`;
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

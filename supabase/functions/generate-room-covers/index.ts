import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders } from "../_shared/cors.ts";
import { AI_CHAT_URL, AI_API_KEY, aiModel } from "../_shared/ai.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all rooms without cover images
    const { data: rooms, error: fetchError } = await supabase
      .from("game_rooms")
      .select("id, room_code")
      .is("cover_image", null);

    if (fetchError) {
      console.error("Error fetching rooms:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${rooms?.length || 0} rooms without covers`);

    const results: { roomId: string; success: boolean; error?: string }[] = [];

    for (const room of rooms || []) {
      try {
        console.log(`Generating cover for room ${room.room_code}`);

        // Generate image using AI gateway
        const aiResponse = await fetch(AI_CHAT_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${AI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: aiModel("google/gemini-2.5-flash-image-preview"),
            messages: [
              {
                role: "user",
                content: "Generate an abstract 3D minimalist background image. Use soft white, light purple, and lavender tones. The style should be neutral, calming, with smooth gradients and soft geometric shapes or waves. No text, no faces, just abstract artistic background suitable for a game room card. Ultra high resolution, 16:9 aspect ratio.",
              },
            ],
            modalities: ["image", "text"],
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error(`AI API error for room ${room.room_code}:`, errorText);
          results.push({ roomId: room.id, success: false, error: errorText });
          continue;
        }

        const aiData = await aiResponse.json();
        const imageBase64 = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (!imageBase64) {
          console.error(`No image generated for room ${room.room_code}`);
          results.push({ roomId: room.id, success: false, error: "No image in response" });
          continue;
        }

        // Extract base64 data (remove data:image/png;base64, prefix)
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

        // Upload to Supabase Storage
        const fileName = `cover_${room.room_code}_${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from("room-covers")
          .upload(fileName, imageBuffer, {
            contentType: "image/png",
            upsert: true,
          });

        if (uploadError) {
          console.error(`Upload error for room ${room.room_code}:`, uploadError);
          results.push({ roomId: room.id, success: false, error: uploadError.message });
          continue;
        }

        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from("room-covers")
          .getPublicUrl(fileName);

        // Update room with cover image URL
        const { error: updateError } = await supabase
          .from("game_rooms")
          .update({ cover_image: publicUrlData.publicUrl })
          .eq("id", room.id);

        if (updateError) {
          console.error(`Update error for room ${room.room_code}:`, updateError);
          results.push({ roomId: room.id, success: false, error: updateError.message });
          continue;
        }

        console.log(`Successfully generated cover for room ${room.room_code}`);
        results.push({ roomId: room.id, success: true });

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (roomError) {
        console.error(`Error processing room ${room.room_code}:`, roomError);
        results.push({ roomId: room.id, success: false, error: String(roomError) });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${results.length} rooms`,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in generate-room-covers:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

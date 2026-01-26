import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders } from "../_shared/cors.ts";

const ROOM_MAX_AGE_DAYS = 10;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate cutoff date (10 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ROOM_MAX_AGE_DAYS);
    const cutoffISO = cutoffDate.toISOString();

    console.log(`Cleaning up rooms with last activity before: ${cutoffISO}`);

    // Find old rooms (use last_activity_at if available, otherwise created_at)
    // Skip permanent rooms (is_permanent = true)
    const { data: oldRooms, error: fetchError } = await supabase
      .from("game_rooms")
      .select("id, room_code, last_activity_at, created_at, is_permanent")
      .or(`last_activity_at.lt.${cutoffISO},and(last_activity_at.is.null,created_at.lt.${cutoffISO})`)
      .neq("is_permanent", true);

    if (fetchError) throw fetchError;

    console.log(`Found ${oldRooms?.length || 0} rooms to delete`);

    if (!oldRooms || oldRooms.length === 0) {
      return new Response(
        JSON.stringify({ message: "No old rooms to delete", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const roomIds = oldRooms.map(r => r.id);

    // Delete related data first (cascade order matters)
    console.log("Deleting player_answers...");
    await supabase.from("player_answers").delete().in("room_id", roomIds);
    
    console.log("Deleting room_questions...");
    await supabase.from("room_questions").delete().in("room_id", roomIds);
    
    console.log("Deleting room_chat_messages...");
    await supabase.from("room_chat_messages").delete().in("room_id", roomIds);
    
    console.log("Deleting room_participants...");
    await supabase.from("room_participants").delete().in("room_id", roomIds);
    
    console.log("Deleting room_category_queue...");
    await supabase.from("room_category_queue").delete().in("room_id", roomIds);
    
    console.log("Deleting game_invitations...");
    await supabase.from("game_invitations").delete().in("room_id", roomIds);
    
    console.log("Deleting room_games...");
    await supabase.from("room_games").delete().in("room_id", roomIds);

    // Delete the rooms themselves
    console.log("Deleting game_rooms...");
    const { error: deleteError } = await supabase
      .from("game_rooms")
      .delete()
      .in("id", roomIds);

    if (deleteError) throw deleteError;

    console.log(`Successfully deleted ${roomIds.length} old rooms`);

    return new Response(
      JSON.stringify({ 
        message: `Deleted ${roomIds.length} rooms older than ${ROOM_MAX_AGE_DAYS} days`,
        count: roomIds.length,
        roomCodes: oldRooms.map(r => r.room_code)
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in cleanup-old-rooms:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

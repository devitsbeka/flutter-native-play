import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // User client to get the user
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    
    if (userError || !user) {
      console.error("User authentication error:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    console.log(`Exporting data for user: ${userId}`);

    // Service role client for reading all data
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Collect data from all relevant tables
    const exportData: Record<string, unknown> = {
      exportDate: new Date().toISOString(),
      userId: userId,
      email: user.email,
    };

    // Tables to export
    const tablesToExport = [
      { name: "profiles", key: "user_id" },
      { name: "game_sessions", key: "user_id" },
      { name: "user_achievements", key: "user_id" },
      { name: "user_daily_plays", key: "user_id" },
      { name: "user_daily_rewards", key: "user_id" },
      { name: "user_daily_spins", key: "user_id" },
      { name: "user_favorites", key: "user_id" },
      { name: "user_league_data", key: "user_id" },
      { name: "user_level_progress", key: "user_id" },
      { name: "user_missions", key: "user_id" },
      { name: "user_mission_streaks", key: "user_id" },
      { name: "user_power_ups", key: "user_id" },
      { name: "user_rewards", key: "user_id" },
      { name: "user_category_progress", key: "user_id" },
      { name: "user_country_progress", key: "user_id" },
      { name: "category_stats", key: "user_id" },
      { name: "category_leaderboard", key: "user_id" },
      { name: "vip_subscriptions", key: "user_id" },
      { name: "friendships", key: "user_id" },
      { name: "notifications", key: "user_id" },
      { name: "avatar_generations", key: "user_id" },
      { name: "room_participants", key: "user_id" },
      { name: "player_answers", key: "user_id" },
    ];

    for (const table of tablesToExport) {
      try {
        const { data, error } = await supabaseAdmin
          .from(table.name)
          .select("*")
          .eq(table.key, userId);
        
        if (error) {
          console.error(`Error fetching ${table.name}:`, error.message);
          exportData[table.name] = { error: error.message };
        } else {
          exportData[table.name] = data || [];
          console.log(`Exported ${data?.length || 0} records from ${table.name}`);
        }
      } catch (e) {
        console.error(`Exception fetching ${table.name}:`, e);
        exportData[table.name] = { error: "fetch failed" };
      }
    }

    // Also get chat messages (both sent and received)
    try {
      const { data: sentMessages } = await supabaseAdmin
        .from("chat_messages")
        .select("*")
        .eq("sender_id", userId);
      
      const { data: receivedMessages } = await supabaseAdmin
        .from("chat_messages")
        .select("*")
        .eq("receiver_id", userId);
      
      exportData.chat_messages = {
        sent: sentMessages || [],
        received: receivedMessages || [],
      };
    } catch (e) {
      console.error("Error fetching chat messages:", e);
    }

    // Get game rooms where user is host
    try {
      const { data: hostedRooms } = await supabaseAdmin
        .from("game_rooms")
        .select("*")
        .eq("host_user_id", userId);
      
      exportData.game_rooms_hosted = hostedRooms || [];
    } catch (e) {
      console.error("Error fetching game rooms:", e);
    }

    console.log(`Successfully exported data for user: ${userId}`);

    return new Response(
      JSON.stringify(exportData, null, 2),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="quizapp-data-export-${new Date().toISOString().split('T')[0]}.json"`,
        } 
      }
    );

  } catch (error) {
    console.error("Unexpected error in export-user-data:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

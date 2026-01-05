import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
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

    // Create Supabase client with user's token
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
    console.log(`Starting account deletion for user: ${userId}`);

    // Service role client for deletion operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Delete user data from all tables in order
    const tablesToDelete = [
      "player_answers",
      "room_participants",
      "room_chat_messages",
      "game_sessions",
      "game_invitations",
      "user_achievements",
      "user_avatar_frames",
      "user_category_progress",
      "user_country_progress",
      "user_daily_plays",
      "user_daily_rewards",
      "user_daily_spins",
      "user_favorites",
      "user_league_data",
      "user_level_progress",
      "user_mission_streaks",
      "user_missions",
      "user_power_ups",
      "user_presence",
      "user_rewards",
      "user_roles",
      "vip_subscriptions",
      "chat_messages",
      "friendships",
      "notifications",
      "category_stats",
      "category_leaderboard",
      "avatar_generations",
      "profiles",
    ];

    const deletionResults: Record<string, string> = {};

    for (const table of tablesToDelete) {
      try {
        const { error } = await supabaseAdmin
          .from(table)
          .delete()
          .eq("user_id", userId);
        
        if (error) {
          console.error(`Error deleting from ${table}:`, error.message);
          deletionResults[table] = `error: ${error.message}`;
        } else {
          deletionResults[table] = "deleted";
          console.log(`Deleted user data from ${table}`);
        }
      } catch (e) {
        console.error(`Exception deleting from ${table}:`, e);
        deletionResults[table] = "exception";
      }
    }

    // Also delete friendships where user is the friend
    try {
      await supabaseAdmin
        .from("friendships")
        .delete()
        .eq("friend_id", userId);
      console.log("Deleted friendships where user is friend");
    } catch (e) {
      console.error("Error deleting friendships (friend_id):", e);
    }

    // Delete chat messages where user is receiver
    try {
      await supabaseAdmin
        .from("chat_messages")
        .delete()
        .eq("receiver_id", userId);
      console.log("Deleted chat messages where user is receiver");
    } catch (e) {
      console.error("Error deleting chat messages (receiver_id):", e);
    }

    // Delete game rooms where user is host
    try {
      await supabaseAdmin
        .from("game_rooms")
        .delete()
        .eq("host_user_id", userId);
      console.log("Deleted game rooms where user is host");
    } catch (e) {
      console.error("Error deleting game rooms:", e);
    }

    // Delete the auth user
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (deleteAuthError) {
      console.error("Error deleting auth user:", deleteAuthError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to delete auth account", 
          details: deleteAuthError.message,
          dataDeleted: deletionResults 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully deleted account for user: ${userId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Account and all data deleted successfully",
        deletedTables: deletionResults 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error in delete-user-account:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

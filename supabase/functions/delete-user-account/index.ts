import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * Account deletion — App Store guideline 5.1.1(v).
 *
 * Every table below is one the user has rows in, with the column that
 * actually references them. This used to be a flat list of table names
 * deleted with `.eq("user_id", ...)`: `chat_messages` and
 * `game_invitations` have no `user_id` column at all, so both deletes
 * errored at PostgREST, the error was swallowed, and the function still
 * answered 200 "deleted successfully". Sixteen further tables holding
 * personal data were never in the list, and nothing cascades to them.
 *
 * Two rules keep that from coming back:
 *   1. Column names are explicit and must exist in
 *      `src/integrations/supabase/types.ts`. A wrong name is a silent
 *      no-op at runtime.
 *   2. A failed delete fails the request (HTTP 500) and the auth user is
 *      NOT removed, so the account can be retried rather than being
 *      orphaned with its data still in the database.
 *
 * The list mirrors the hand-written deletion script in
 * `supabase/migrations/20260208191527_*.sql`, in the same order (children
 * before parents, `profiles` last).
 */
type DeletionTarget = {
  table: string;
  /** Columns that can reference the user. More than one means OR. */
  columns: string[];
};

const DELETION_TARGETS: DeletionTarget[] = [
  { table: "player_answers", columns: ["user_id"] },
  { table: "room_participants", columns: ["user_id"] },
  { table: "room_chat_messages", columns: ["user_id"] },
  { table: "game_sessions", columns: ["user_id"] },
  // No user_id column — a row references the user as sender or receiver.
  { table: "game_invitations", columns: ["sender_id", "receiver_id"] },
  { table: "user_achievements", columns: ["user_id"] },
  { table: "user_avatar_frames", columns: ["user_id"] },
  { table: "user_category_progress", columns: ["user_id"] },
  { table: "user_country_progress", columns: ["user_id"] },
  { table: "user_daily_plays", columns: ["user_id"] },
  { table: "user_daily_rewards", columns: ["user_id"] },
  { table: "user_daily_spins", columns: ["user_id"] },
  { table: "user_favorites", columns: ["user_id"] },
  { table: "user_league_data", columns: ["user_id"] },
  { table: "user_level_progress", columns: ["user_id"] },
  { table: "user_mission_streaks", columns: ["user_id"] },
  { table: "user_missions", columns: ["user_id"] },
  { table: "user_power_ups", columns: ["user_id"] },
  { table: "user_presence", columns: ["user_id"] },
  { table: "user_rewards", columns: ["user_id"] },
  { table: "user_roles", columns: ["user_id"] },
  { table: "vip_subscriptions", columns: ["user_id"] },
  // No user_id column either — sent messages were never being deleted.
  { table: "chat_messages", columns: ["sender_id", "receiver_id"] },
  { table: "friendships", columns: ["user_id", "friend_id"] },
  { table: "notifications", columns: ["user_id"] },
  { table: "category_stats", columns: ["user_id"] },
  { table: "category_leaderboard", columns: ["user_id"] },
  { table: "avatar_generations", columns: ["user_id"] },
  { table: "game_plays", columns: ["user_id"] },
  { table: "push_tokens", columns: ["user_id"] },
  { table: "category_weekly_rewards", columns: ["user_id"] },
  // invited_user_id too: those rows carry the deleted user's email address.
  { table: "friend_invites", columns: ["inviter_id", "invited_user_id"] },
  { table: "gem_purchases", columns: ["user_id"] },
  { table: "purchase_transactions", columns: ["user_id"] },
  { table: "quiz_post_comments", columns: ["user_id"] },
  { table: "quiz_post_likes", columns: ["user_id"] },
  { table: "quiz_post_plays", columns: ["user_id"] },
  { table: "quiz_post_saves", columns: ["user_id"] },
  { table: "trivia_drafts", columns: ["user_id"] },
  { table: "collection_drafts", columns: ["user_id"] },
  { table: "cover_image_generations", columns: ["user_id"] },
  { table: "user_quiz_posts", columns: ["user_id"] },
  { table: "quiz_collections", columns: ["user_id"] },
  // Holds the nickname and avatar the user played TV rounds under.
  { table: "tv_players", columns: ["user_id"] },
  // Rooms the user hosted. Rooms hosted by someone else that merely
  // reference this user (challenged_user_id) belong to that other user and
  // are left alone; the user's own participation rows are gone above.
  { table: "game_rooms", columns: ["host_user_id"] },
  { table: "profiles", columns: ["user_id"] },
];

/**
 * Buckets every user upload lands in. Both are written as
 * `${userId}/<file>` by every upload path in the app and in the avatar /
 * cover edge functions, so the user's folder is the whole of their
 * storage footprint: raw face photos, AI avatars, animated avatars and
 * quiz cover images. The delete page promises these are removed; before
 * this they stayed at public URLs forever.
 */
const STORAGE_BUCKETS = ["avatars", "quiz-covers"];

// deno-lint-ignore no-explicit-any
type SupabaseAdmin = any;

/**
 * Collects every object path under `prefix`, following the one level of
 * nesting Storage can report (entries with a null id are folders).
 */
async function listFolderPaths(
  supabaseAdmin: SupabaseAdmin,
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const paths: string[] = [];
  const pageSize = 100;
  let offset = 0;

  for (;;) {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .list(prefix, { limit: pageSize, offset });

    if (error) throw new Error(error.message);
    // A folder with no objects lists as an empty array, not an error.
    if (!data || data.length === 0) break;

    for (const entry of data as Array<{ name: string; id: string | null }>) {
      const path = `${prefix}/${entry.name}`;
      if (entry.id === null) {
        // Sub-folder — recurse rather than trying to remove the folder.
        paths.push(...(await listFolderPaths(supabaseAdmin, bucket, path)));
      } else {
        paths.push(path);
      }
    }

    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return paths;
}

/** Removes every object the user owns in `bucket`. */
async function deleteUserStorage(
  supabaseAdmin: SupabaseAdmin,
  bucket: string,
  userId: string,
): Promise<string> {
  const paths = await listFolderPaths(supabaseAdmin, bucket, userId);

  if (paths.length === 0) return "empty";

  // remove() takes a bounded list; page it for heavy accounts.
  const chunkSize = 100;
  for (let i = 0; i < paths.length; i += chunkSize) {
    const chunk = paths.slice(i, i + chunkSize);
    const { error } = await supabaseAdmin.storage.from(bucket).remove(chunk);
    if (error) throw new Error(error.message);
  }

  return `deleted ${paths.length} object(s)`;
}

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

    const deletionResults: Record<string, string> = {};
    const failures: string[] = [];

    // ---- Database rows -------------------------------------------------
    for (const { table, columns } of DELETION_TARGETS) {
      try {
        const query = supabaseAdmin.from(table).delete();
        const { error } = await (
          columns.length === 1
            ? query.eq(columns[0], userId)
            : query.or(columns.map((c) => `${c}.eq.${userId}`).join(","))
        );

        if (error) {
          console.error(`Error deleting from ${table}:`, error.message);
          deletionResults[table] = `error: ${error.message}`;
          failures.push(table);
        } else {
          deletionResults[table] = "deleted";
          console.log(`Deleted user data from ${table} (${columns.join(", ")})`);
        }
      } catch (e) {
        console.error(`Exception deleting from ${table}:`, e);
        deletionResults[table] = `exception: ${String(e)}`;
        failures.push(table);
      }
    }

    // ---- Storage objects -----------------------------------------------
    for (const bucket of STORAGE_BUCKETS) {
      const key = `storage:${bucket}`;
      try {
        deletionResults[key] = await deleteUserStorage(supabaseAdmin, bucket, userId);
        console.log(`Storage ${bucket}: ${deletionResults[key]}`);
      } catch (e) {
        console.error(`Error deleting storage bucket ${bucket}:`, e);
        deletionResults[key] = `error: ${String(e)}`;
        failures.push(key);
      }
    }

    // ---- Only now may the auth user go ---------------------------------
    // Deleting the login while rows remain would strand the data with no
    // way for the user to ask again, and would make the failure invisible.
    if (failures.length > 0) {
      console.error(
        `Account deletion incomplete for ${userId}; failed: ${failures.join(", ")}`
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: "Account deletion incomplete",
          failed: failures,
          results: deletionResults,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error("Error deleting auth user:", deleteAuthError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to delete auth account",
          details: deleteAuthError.message,
          results: deletionResults,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully deleted account for user: ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Account and all data deleted successfully",
        results: deletionResults,
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

// Explicit profile column list that OMITS the credential secrets
// `security_answer_hash` and `security_question_id`. Both are written at
// signup and used only server-side (edge function
// `reset-password-with-security`, service role) - the client never needs to
// read either. Selecting columns explicitly (instead of `*`) lets the
// database withhold them from anon/authenticated without breaking
// own-profile reads. Writes are unaffected: an UPDATE needs UPDATE
// privilege on a column, not SELECT.
//
// `security_question_id` is omitted for the same reason: naming the
// question that guards an account helps attack the reset flow, and the
// client never reads it - ForgotPassword gets it from the
// `reset-password-with-security` edge function. Signup writes it.
//
// `gems` and `referral_code` are omitted for a different reason: they were
// readable by ANYONE, because the anon key ships in the client bundle. A
// single unauthenticated request returned every live referral code in the
// product - the token that attributes a signup to someone. The database now
// refuses both columns to anon and authenticated; the owner reads their own
// through get_my_private_profile(), and signup resolves a code it was handed
// through resolve_referral_code().
//
// `coins` deliberately stays: the league leaderboard renders other players'
// coins and promotes tiers off them, so it is a public score by design.
//
// Keep in sync with the `profiles` table columns (minus the four above).
export const PROFILE_SELECT_COLUMNS = [
  "id",
  "user_id",
  "nickname",
  "avatar_url",
  "animated_avatar_url",
  "country_code",
  "region",
  "preferred_language",
  "age_group",
  "has_face_photo",
  "total_points",
  "total_correct_answers",
  "games_played",
  "games_won",
  "current_streak",
  "best_streak",
  "coins",
  "last_play_regen_at",
  "referred_by_invite_id",
  "created_at",
  "updated_at",
].join(", ");

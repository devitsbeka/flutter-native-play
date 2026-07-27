// Explicit profile column list that OMITS the credential secret
// `security_answer_hash`. That column is written at signup and verified
// only server-side (edge function `reset-password-with-security`, service
// role) - the client never needs to read it. Selecting columns explicitly
// (instead of `*`) lets the database REVOKE SELECT on the hash from
// anon/authenticated without breaking own-profile reads.
//
// Keep in sync with the `profiles` table columns (minus the secret).
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
  "gems",
  "last_play_regen_at",
  "referral_code",
  "referred_by_invite_id",
  "security_question_id",
  "created_at",
  "updated_at",
].join(", ");

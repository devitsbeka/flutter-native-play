import type { User } from "@supabase/supabase-js";

/**
 * Whether this session belongs to a guest rather than a real account.
 *
 * Opening a shared room link signs the visitor in anonymously so they can
 * play straight away — they hold a Supabase user, so `!user` is false and
 * every other guest check in the app misses them. Supabase reports it two
 * ways depending on the token's age, so both are accepted.
 */
export function isGuestAccount(user: Pick<User, "is_anonymous" | "app_metadata"> | null | undefined): boolean {
  if (!user) return false;
  if (user.is_anonymous) return true;
  return user.app_metadata?.provider === "anonymous";
}

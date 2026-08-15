/**
 * Which tab of the activity screen a notification belongs to.
 *
 * One list, because there were two — identical arrays in Notifications.tsx and
 * NotificationsPanel.tsx — and a type added to one would simply not appear in
 * the other, with nothing to say so.
 *
 * Games is the catch-all on purpose: any type not named here lands there, so a
 * new kind of notification is always visible somewhere and can always be
 * marked read. Fixed per-tab lists left unlisted types invisible *and*
 * permanently unread, which is a bell badge that can never clear.
 */

export type NotificationTab = "games" | "social" | "trivia";

export const SOCIAL_TYPES = [
  "friend_request",
  // The sender's own copy. Without it, the Friends tab is empty for the
  // person doing the inviting — the request is only ever written to whoever
  // receives it.
  "friend_request_sent",
  "friend_accepted",
];

export const TRIVIA_TYPES = ["trivia_liked", "trivia_saved", "trivia_played"];

export function typeInTab(type: string, tab: NotificationTab): boolean {
  if (tab === "social") return SOCIAL_TYPES.includes(type);
  if (tab === "trivia") return TRIVIA_TYPES.includes(type);
  return !SOCIAL_TYPES.includes(type) && !TRIVIA_TYPES.includes(type);
}

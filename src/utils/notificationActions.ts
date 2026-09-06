import { supabase } from "@/integrations/supabase/client";

/**
 * Record what was done about a notification that asked for an answer.
 *
 * The card in the list reads `data.action_taken` to show "accepted" or
 * "declined" instead of the two buttons, and `read_at` takes it off the
 * unread count. `null` marks it read without an outcome — for an ask whose
 * subject is already gone (a request withdrawn before it was answered).
 * The data is merged, not replaced: the row's other fields (who asked,
 * about what) stay for the card to render.
 */
export async function markNotificationActioned(
  notificationId: string,
  action: "accepted" | "declined" | null,
): Promise<void> {
  const { data: current } = await supabase
    .from("notifications")
    .select("data")
    .eq("id", notificationId)
    .single();
  const merged = {
    ...((current?.data as Record<string, unknown> | null) || {}),
    ...(action ? { action_taken: action } : {}),
  };
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString(), data: merged })
    .eq("id", notificationId);
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Icons sent between players during a match (room_reactions, 20260927100000).
 *
 * The sender's side is one insert. The recipient's side is a small inbox:
 * everything addressed to me in this room since I opened the match, read
 * once on mount and then live, so the strip that shows "what came in while
 * you were playing" is ready the moment the turn ends.
 */
export interface RoomReaction {
  id: string;
  room_id: string;
  from_user_id: string;
  to_user_id: string;
  icon: string;
  created_at: string;
}

const RECENT_KEY = "tb-recent-icons";
export const RECENT_ICONS_MAX = 6;

/** The icons this device sent most recently, newest first. */
export function readRecentIcons(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function rememberRecentIcon(icon: string): string[] {
  const next = [icon, ...readRecentIcons().filter((x) => x !== icon)].slice(0, RECENT_ICONS_MAX);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Storage can be unavailable (private mode); the strip just forgets.
  }
  return next;
}

export async function sendReaction(roomId: string, toUserId: string, icon: string): Promise<boolean> {
  const { error } = await supabase
    .from("room_reactions")
    .insert({ room_id: roomId, to_user_id: toUserId, icon, from_user_id: (await supabase.auth.getUser()).data.user?.id ?? "" });
  if (error) {
    console.error("[reactions] send failed", error);
    return false;
  }
  return true;
}

/**
 * What came in for me in this room since I opened the match, live.
 *
 * `dismiss` empties the inbox — the strip was read — and the next icons
 * start a fresh batch.
 */
export function useIncomingReactions(roomId: string | null | undefined, meId: string | null | undefined) {
  const [items, setItems] = useState<RoomReaction[]>([]);
  const sinceRef = useRef(new Date().toISOString());
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!roomId || !meId) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("room_reactions")
        .select("*")
        .eq("room_id", roomId)
        .eq("to_user_id", meId)
        .gt("created_at", sinceRef.current)
        .order("created_at", { ascending: true });
      if (cancelled || !data) return;
      setItems((prev) => {
        const known = new Set(prev.map((r) => r.id));
        const fresh = (data as RoomReaction[]).filter((r) => !known.has(r.id) && !seenRef.current.has(r.id));
        return fresh.length ? [...prev, ...fresh] : prev;
      });
    })();
    const channel = supabase
      .channel(`room-reactions-${roomId}-${meId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_reactions",
          filter: `to_user_id=eq.${meId}`,
        },
        (payload) => {
          const row = payload.new as RoomReaction;
          if (row.room_id !== roomId || seenRef.current.has(row.id)) return;
          setItems((prev) => (prev.some((r) => r.id === row.id) ? prev : [...prev, row]));
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [roomId, meId]);

  const dismiss = useCallback(() => {
    setItems((prev) => {
      prev.forEach((r) => seenRef.current.add(r.id));
      return [];
    });
  }, []);

  return useMemo(() => ({ items, dismiss }), [items, dismiss]);
}

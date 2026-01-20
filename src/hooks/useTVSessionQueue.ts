import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TVQueueItem {
  id: string;
  session_id: string;
  position: number;
  source_type: string;
  category_id: string | null;
  category_name: string | null;
  icon_slug: string | null;
  user_trivia_id: string | null;
  created_at: string;
}

export function useTVSessionQueue(sessionId: string | null) {
  const [queue, setQueue] = useState<TVQueueItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!sessionId) {
      setQueue([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("tv_session_queue")
      .select("*")
      .eq("session_id", sessionId)
      .order("position", { ascending: true });
    setLoading(false);
    if (error) return;
    setQueue((data || []) as TVQueueItem[]);
  }, [sessionId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`tv_session_queue_${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tv_session_queue",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, refetch]);

  const addCategoryToQueue = useCallback(
    async (category: { id: string; name: string; icon_slug?: string | null }) => {
      if (!sessionId) return;
      const nextPos = queue.length;
      await supabase.from("tv_session_queue").insert({
        session_id: sessionId,
        position: nextPos,
        source_type: "category",
        category_id: category.id,
        category_name: category.name,
        icon_slug: category.icon_slug || null,
      });
      // realtime will refetch
    },
    [sessionId, queue.length]
  );

  const removeFromQueue = useCallback(
    async (itemId: string) => {
      if (!sessionId) return;
      await supabase.from("tv_session_queue").delete().eq("id", itemId);
      // Reorder remaining
      const { data: remaining } = await supabase
        .from("tv_session_queue")
        .select("id")
        .eq("session_id", sessionId)
        .order("position", { ascending: true });
      if (remaining?.length) {
        await Promise.all(
          remaining.map((item, index) =>
            supabase.from("tv_session_queue").update({ position: index }).eq("id", item.id)
          )
        );
      }
    },
    [sessionId]
  );

  const hasQueue = useMemo(() => queue.length > 0, [queue.length]);

  return {
    queue,
    loading,
    hasQueue,
    refetch,
    addCategoryToQueue,
    removeFromQueue,
  };
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORY_ID_TO_ICON } from "@/data/categoryIconMap";

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

/**
 * Hook to manage TV session queue with fallback to room_category_queue
 * @param sessionId - The TV session ID
 * @param roomIdFallback - Optional room ID to fallback to room_category_queue if TV queue is empty
 */
export function useTVSessionQueue(sessionId: string | null, roomIdFallback?: string | null) {
  const [queue, setQueue] = useState<TVQueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [usingRoomFallback, setUsingRoomFallback] = useState(false);

  const refetch = useCallback(async () => {
    if (!sessionId) {
      setQueue([]);
      return;
    }
    setLoading(true);

    console.log('[useTVSessionQueue] Fetching queue for sessionId:', sessionId, 'roomIdFallback:', roomIdFallback);

    // Prefer the TV session queue when present (single source of truth for actual playback)
    const { data: tvData, error: tvError } = await supabase
      .from("tv_session_queue")
      .select("*")
      .eq("session_id", sessionId)
      .order("position", { ascending: true });

    console.log('[useTVSessionQueue] tv_session_queue result:', { tvData, tvError, count: tvData?.length });

    if (!tvError && tvData && tvData.length > 0) {
      console.log('[useTVSessionQueue] Using tv_session_queue directly:', tvData);
      setQueue(tvData as TVQueueItem[]);
      setUsingRoomFallback(false);
      setLoading(false);
      return;
    }
    
    // If linked to a room, build full queue: initial category + room queue items
    if (roomIdFallback) {
      console.log('[useTVSessionQueue] Attempting room fallback for roomId:', roomIdFallback);
      
      // Get room's initial category (set during room creation)
      const { data: roomInfo } = await supabase
        .from("game_rooms")
        .select("category_id, category_name")
        .eq("id", roomIdFallback)
        .maybeSingle();
      
      console.log('[useTVSessionQueue] Room info:', roomInfo);
      
      // Fetch queue items added in lobby
      const { data: roomData, error: roomError } = await supabase
        .from("room_category_queue")
        .select("*")
        .eq("room_id", roomIdFallback)
        .order("position", { ascending: true });
      
      console.log('[useTVSessionQueue] room_category_queue result:', { roomData, roomError });
      
      const fullQueue: TVQueueItem[] = [];
      
      // Add initial category as position 0 (if exists)
      if (roomInfo?.category_id && roomInfo?.category_name) {
        // Resolve icon_slug from CATEGORY_ID_TO_ICON instead of using null
        const iconSlug = CATEGORY_ID_TO_ICON[roomInfo.category_id] || null;
        
        fullQueue.push({
          id: `initial-${roomIdFallback}`,
          session_id: sessionId,
          position: 0,
          source_type: "category",
          category_id: roomInfo.category_id,
          category_name: roomInfo.category_name,
          icon_slug: iconSlug,
          user_trivia_id: null,
          created_at: new Date().toISOString(),
        });
      }
      
      // Add queue items with adjusted positions
      if (!roomError && roomData) {
        roomData.forEach((item, idx) => {
          fullQueue.push({
            id: item.id,
            session_id: sessionId,
            position: fullQueue.length + idx,
            source_type: item.source_type,
            category_id: item.category_id,
            category_name: item.category_name,
            icon_slug: item.icon_slug,
            user_trivia_id: item.user_trivia_id,
            created_at: item.created_at || new Date().toISOString(),
          });
        });
      }
      
      console.log('[useTVSessionQueue] Fallback fullQueue:', fullQueue);
      
      if (fullQueue.length > 0) {
        setQueue(fullQueue);
        setUsingRoomFallback(true);
        setLoading(false);
        return;
      }
    }
    
    console.log('[useTVSessionQueue] No queue found, setting empty');
    setQueue([]);
    setUsingRoomFallback(false);
    setLoading(false);
  }, [sessionId, roomIdFallback]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!sessionId) return;
    
    // Subscribe to TV session queue changes
    const tvChannel = supabase
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
    
    // Also subscribe to room queue changes if we have a room fallback
    let roomChannel: ReturnType<typeof supabase.channel> | null = null;
    if (roomIdFallback) {
      roomChannel = supabase
        .channel(`room_category_queue_${roomIdFallback}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "room_category_queue",
            filter: `room_id=eq.${roomIdFallback}`,
          },
          () => {
            refetch();
          }
        )
        .subscribe();
    }
    
    return () => {
      supabase.removeChannel(tvChannel);
      if (roomChannel) {
        supabase.removeChannel(roomChannel);
      }
    };
  }, [sessionId, roomIdFallback, refetch]);

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
    usingRoomFallback,
    refetch,
    addCategoryToQueue,
    removeFromQueue,
  };
}

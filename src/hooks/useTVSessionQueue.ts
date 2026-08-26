import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { categoryIconSlugSync, primeCategoryIconSlugs } from "@/hooks/useCategoryDisplay";

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
 * @param mockQueue - Optional mock queue for showcase/testing purposes
 */
export function useTVSessionQueue(sessionId: string | null, roomIdFallback?: string | null, mockQueue?: TVQueueItem[]) {
  const [queue, setQueue] = useState<TVQueueItem[]>(mockQueue || []);
  const [loading, setLoading] = useState(!mockQueue);
  const [usingRoomFallback, setUsingRoomFallback] = useState(false);
  
  // Track next position to avoid race conditions during rapid additions
  const nextPositionRef = useRef(0);

  // If mock queue is provided, use it directly (for showcase mode)
  const isMockMode = mockQueue !== undefined;
  
  // Use refs to avoid stale closures in refetch
  const sessionIdRef = useRef(sessionId);
  const roomIdFallbackRef = useRef(roomIdFallback);
  const isMockModeRef = useRef(isMockMode);
  const mockQueueRef = useRef(mockQueue);
  
  // Keep refs in sync
  useEffect(() => {
    sessionIdRef.current = sessionId;
    roomIdFallbackRef.current = roomIdFallback;
    isMockModeRef.current = isMockMode;
    mockQueueRef.current = mockQueue;
  }, [sessionId, roomIdFallback, isMockMode, mockQueue]);

  const refetch = useCallback(async () => {
    const currentSessionId = sessionIdRef.current;
    const currentRoomIdFallback = roomIdFallbackRef.current;
    const currentIsMockMode = isMockModeRef.current;
    const currentMockQueue = mockQueueRef.current;
    
    // In mock mode, use the provided mock queue
    if (currentIsMockMode) {
      setQueue(currentMockQueue || []);
      setLoading(false);
      return;
    }

    if (!currentSessionId) {
      setQueue([]);
      return;
    }
    setLoading(true);

    console.log('[useTVSessionQueue] Fetching queue for sessionId:', currentSessionId, 'roomIdFallback:', currentRoomIdFallback);

    // Prefer the TV session queue when present (single source of truth for actual playback)
    const { data: tvData, error: tvError } = await supabase
      .from("tv_session_queue")
      .select("*")
      .eq("session_id", currentSessionId)
      .order("position", { ascending: true });

    console.log('[useTVSessionQueue] tv_session_queue result:', { tvData, tvError, count: tvData?.length });

    if (!tvError && tvData && tvData.length > 0) {
      console.log('[useTVSessionQueue] Using tv_session_queue directly:', tvData);
      setQueue(tvData as TVQueueItem[]);
      nextPositionRef.current = tvData.length; // Sync position ref
      setUsingRoomFallback(false);
      setLoading(false);
      return;
    }
    
    // If linked to a room, build full queue: initial category + room queue items
    if (currentRoomIdFallback) {
      console.log('[useTVSessionQueue] Attempting room fallback for roomId:', currentRoomIdFallback);
      
      // Get room's initial category (set during room creation)
      const { data: roomInfo } = await supabase
        .from("game_rooms")
        .select("category_id, category_name")
        .eq("id", currentRoomIdFallback)
        .maybeSingle();
      
      console.log('[useTVSessionQueue] Room info:', roomInfo);
      
      // Fetch queue items added in lobby
      const { data: roomData, error: roomError } = await supabase
        .from("room_category_queue")
        .select("*")
        .eq("room_id", currentRoomIdFallback)
        .order("position", { ascending: true });
      
      console.log('[useTVSessionQueue] room_category_queue result:', { roomData, roomError });
      
      const fullQueue: TVQueueItem[] = [];
      
      // Add initial category as position 0 (if exists)
      if (roomInfo?.category_id && roomInfo?.category_name) {
        // The column Discover reads, not the hardcoded map — those had drifted
        // apart on 39 of 70 categories, which is why a round showed one icon
        // in the queue and another on its card.
        await primeCategoryIconSlugs();
        const iconSlug = categoryIconSlugSync(roomInfo.category_id);
        
        fullQueue.push({
          id: `initial-${currentRoomIdFallback}`,
          session_id: currentSessionId,
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
            session_id: currentSessionId,
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
        nextPositionRef.current = fullQueue.length; // Sync position ref
        setUsingRoomFallback(true);
        setLoading(false);
        return;
      }
    }
    
    console.log('[useTVSessionQueue] No queue found, setting empty');
    setQueue([]);
    nextPositionRef.current = 0; // Reset position ref
    setUsingRoomFallback(false);
    setLoading(false);
  }, []); // Empty deps - uses refs instead

  // Initial fetch and refetch when dependencies change
  useEffect(() => {
    refetch();
  }, [sessionId, roomIdFallback, refetch]);

  // Sync state when mockQueue changes
  useEffect(() => {
    if (mockQueue !== undefined) {
      setQueue(mockQueue);
    }
  }, [mockQueue]);

  // Skip realtime subscriptions in mock mode
  useEffect(() => {
    if (isMockMode || !sessionId) return;
    
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

  // IMPORTANT: Library categories added via addCategoryToQueue should NEVER have suggester metadata.
  // This ensures hosts can always play library categories without being marked as "observer".
  // Only user trivias (added via addToQueue with user_trivia_id) can have suggester info.
  const addCategoryToQueue = useCallback(
    async (category: { id: string; name: string; icon_slug?: string | null }) => {
      if (!sessionId) return;
      
      // Get position and increment ref immediately to prevent race conditions
      const nextPos = nextPositionRef.current;
      nextPositionRef.current += 1;
      
      // Create optimistic item
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const optimisticItem: TVQueueItem = {
        id: tempId,
        session_id: sessionId,
        position: nextPos,
        source_type: "category",
        category_id: category.id,
        category_name: category.name,
        icon_slug: category.icon_slug || null,
        user_trivia_id: null,
        created_at: new Date().toISOString(),
      };
      
      // Optimistic update
      setQueue(prev => [...prev, optimisticItem]);
      
      // NOTE: No suggester fields are set for library categories.
      // This is intentional - the host should ALWAYS play library categories.
      const { error } = await supabase.from("tv_session_queue").insert({
        session_id: sessionId,
        position: nextPos,
        source_type: "category",
        category_id: category.id,
        category_name: category.name,
        icon_slug: category.icon_slug || null,
        // No suggester_user_id, suggester_nickname, or suggester_avatar_url
      });
      
      if (error) {
        console.error('[useTVSessionQueue] addCategoryToQueue failed:', error);
        // Revert optimistic update
        setQueue(prev => prev.filter(q => q.id !== tempId));
        nextPositionRef.current -= 1;
      } else {
        // Refetch to get real IDs
        refetch();
      }
    },
    [sessionId, refetch]
  );

  const addToQueue = useCallback(
    async (item: {
      source_type: "category" | "random" | "user_trivia";
      category_id?: string | null;
      category_name?: string | null;
      icon_slug?: string | null;
      user_trivia_id?: string | null;
    }) => {
      if (!sessionId) return;
      
      // Get position and increment ref immediately to prevent race conditions
      const nextPos = nextPositionRef.current;
      nextPositionRef.current += 1;
      
      // Create optimistic item
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const optimisticItem: TVQueueItem = {
        id: tempId,
        session_id: sessionId,
        position: nextPos,
        source_type: item.source_type,
        category_id: item.category_id || null,
        category_name: item.category_name || null,
        icon_slug: item.icon_slug || null,
        user_trivia_id: item.user_trivia_id || null,
        created_at: new Date().toISOString(),
      };
      
      // Optimistic update
      setQueue(prev => [...prev, optimisticItem]);
      
      const { error } = await supabase.from("tv_session_queue").insert({
        session_id: sessionId,
        position: nextPos,
        source_type: item.source_type,
        category_id: item.category_id || null,
        category_name: item.category_name || null,
        icon_slug: item.icon_slug || null,
        user_trivia_id: item.user_trivia_id || null,
      });
      
      if (error) {
        console.error('[useTVSessionQueue] addToQueue failed:', error);
        // Revert optimistic update
        setQueue(prev => prev.filter(q => q.id !== tempId));
        nextPositionRef.current -= 1;
      } else {
        // Refetch to get real IDs
        refetch();
      }
    },
    [sessionId, refetch]
  );

  const removeFromQueue = useCallback(
    async (itemId: string) => {
      const currentSessionId = sessionIdRef.current;
      if (!currentSessionId) return;
      
      // Handle synthetic IDs that don't exist in database
      // These are optimistic items or fallback items with temp-/initial- prefixes
      if (itemId.startsWith('temp-') || itemId.startsWith('initial-')) {
        console.log('[useTVSessionQueue] Removing synthetic item from local state:', itemId);
        setQueue(prev => prev.filter(q => q.id !== itemId));
        nextPositionRef.current = Math.max(0, nextPositionRef.current - 1);
        return;
      }
      
      // Delete from database
      await supabase.from("tv_session_queue").delete().eq("id", itemId);
      
      // Reorder remaining
      const { data: remaining } = await supabase
        .from("tv_session_queue")
        .select("id")
        .eq("session_id", currentSessionId)
        .order("position", { ascending: true });
      if (remaining?.length) {
        await Promise.all(
          remaining.map((item, index) =>
            supabase.from("tv_session_queue").update({ position: index }).eq("id", item.id)
          )
        );
      }
      
      // Refetch to sync state
      refetch();
    },
    [refetch]
  );

  const reorderQueue = useCallback(
    async (newOrder: TVQueueItem[]) => {
      if (!sessionId) return;
      
      // Optimistic update
      setQueue(newOrder);
      
      // Sync positions to database
      await Promise.all(
        newOrder.map((item, index) =>
          supabase.from("tv_session_queue").update({ position: index }).eq("id", item.id)
        )
      );
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
    addToQueue,
    removeFromQueue,
    reorderQueue,
  };
}

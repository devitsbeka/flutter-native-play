import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface QueueItem {
  id: string;
  room_id: string;
  position: number;
  source_type: "category" | "random" | "user_trivia";
  category_id: string | null;
  category_name: string | null;
  user_trivia_id: string | null;
  icon_slug: string | null;
  created_at: string;
}

export function useRoomCategoryQueue(roomId: string | null) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch queue
  const fetchQueue = useCallback(async () => {
    if (!roomId) return;
    
    const { data, error } = await supabase
      .from("room_category_queue")
      .select("*")
      .eq("room_id", roomId)
      .order("position", { ascending: true });
    
    if (!error && data) {
      setQueue(data as QueueItem[]);
    }
  }, [roomId]);

  // Subscribe to queue changes
  useEffect(() => {
    if (!roomId) return;

    fetchQueue();

    const channel = supabase
      .channel(`queue-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_category_queue", filter: `room_id=eq.${roomId}` },
        () => fetchQueue()
      )
      .subscribe((status) => {
        // Ensure we don't miss items created right before/while the subscription is attaching.
        if (status === 'SUBSCRIBED') {
          fetchQueue();
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, fetchQueue]);

  // Add item to queue
  const addToQueue = useCallback(async (item: {
    source_type: "category" | "random" | "user_trivia";
    category_id?: string | null;
    category_name?: string | null;
    user_trivia_id?: string | null;
    icon_slug?: string | null;
  }) => {
    if (!roomId) return false;
    
    setLoading(true);
    try {
      const nextPosition = queue.length;
      
      const { error } = await supabase
        .from("room_category_queue")
        .insert({
          room_id: roomId,
          position: nextPosition,
          source_type: item.source_type,
          category_id: item.category_id || null,
          category_name: item.category_name || null,
          user_trivia_id: item.user_trivia_id || null,
          icon_slug: item.icon_slug || null,
        });
      
      if (error) throw error;
      return true;
    } catch (e) {
      console.error("Error adding to queue:", e);
      return false;
    } finally {
      setLoading(false);
    }
  }, [roomId, queue.length]);

  // Remove item from queue
  const removeFromQueue = useCallback(async (itemId: string) => {
    if (!roomId) return false;
    
    // Check if item exists before trying to remove (prevents double-delete)
    const itemToRemove = queue.find(q => q.id === itemId);
    if (!itemToRemove) return false;
    
    // Optimistic update - immediately remove from local state
    const remaining = queue.filter(q => q.id !== itemId);
    setQueue(remaining.map((item, index) => ({ ...item, position: index })));
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("room_category_queue")
        .delete()
        .eq("id", itemId);
      
      if (error) throw error;
      
      // Reorder remaining items in database
      if (remaining.length > 0) {
        await Promise.all(
          remaining.map((item, index) =>
            supabase
              .from("room_category_queue")
              .update({ position: index })
              .eq("id", item.id)
          )
        );
      }
      
      return true;
    } catch (e) {
      console.error("Error removing from queue:", e);
      // On error, refetch to restore correct state
      await fetchQueue();
      return false;
    } finally {
      setLoading(false);
    }
  }, [roomId, queue, fetchQueue]);

  // Pop first item from queue (for game start)
  const popFromQueue = useCallback(async (): Promise<QueueItem | null> => {
    if (!roomId || queue.length === 0) return null;
    
    const firstItem = queue[0];
    await removeFromQueue(firstItem.id);
    return firstItem;
  }, [roomId, queue, removeFromQueue]);

  // Clear entire queue
  const clearQueue = useCallback(async () => {
    if (!roomId) return false;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("room_category_queue")
        .delete()
        .eq("room_id", roomId);
      
      if (error) throw error;
      setQueue([]);
      return true;
    } catch (e) {
      console.error("Error clearing queue:", e);
      return false;
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  /**
   * Swap what a queue row holds, keeping the row.
   *
   * Used when a queued round is dragged to round 1: the room takes that
   * round (it lives on game_rooms, not in this table) and the round the room
   * WAS holding needs a queue row. Rather than delete one and insert
   * another — whose id nobody knows until the realtime refetch, so the new
   * order could not name it — the promoted row is rewritten in place to
   * carry the old round. Same id, so `reorderQueue` can place it.
   */
  const replaceQueueItem = useCallback(async (
    itemId: string,
    round: {
      source_type: "category" | "random" | "user_trivia";
      category_id?: string | null;
      category_name?: string | null;
      user_trivia_id?: string | null;
      icon_slug?: string | null;
    },
  ) => {
    if (!roomId) return false;
    const patch = {
      source_type: round.source_type,
      category_id: round.category_id || null,
      category_name: round.category_name || null,
      user_trivia_id: round.user_trivia_id || null,
      icon_slug: round.icon_slug || null,
    };
    setQueue((prev) => prev.map((q) => (q.id === itemId ? { ...q, ...patch } : q)));
    try {
      const { error } = await supabase
        .from("room_category_queue")
        .update(patch)
        .eq("id", itemId);
      if (error) throw error;
      return true;
    } catch (e) {
      console.error("Error replacing queue item:", e);
      fetchQueue();
      return false;
    }
  }, [roomId, fetchQueue]);

  // Reorder queue items (for drag-and-drop)
  const reorderQueue = useCallback(async (newOrder: QueueItem[]) => {
    if (!roomId) return false;
    
    // Optimistically update local state first
    setQueue(newOrder);
    
    try {
      // Update positions in database
      await Promise.all(
        newOrder.map((item, index) =>
          supabase
            .from("room_category_queue")
            .update({ position: index })
            .eq("id", item.id)
        )
      );
      
      return true;
    } catch (e) {
      console.error("Error reordering queue:", e);
      fetchQueue(); // Refetch on error to restore correct state
      return false;
    }
  }, [roomId, fetchQueue]);

  return {
    queue,
    loading,
    addToQueue,
    replaceQueueItem,
    removeFromQueue,
    popFromQueue,
    clearQueue,
    reorderQueue,
    refetch: fetchQueue,
  };
}

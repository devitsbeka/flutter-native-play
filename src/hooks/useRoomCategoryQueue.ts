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
      .subscribe();

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
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("room_category_queue")
        .delete()
        .eq("id", itemId);
      
      if (error) throw error;
      
      // Reorder remaining items
      const remaining = queue.filter(q => q.id !== itemId);
      await Promise.all(
        remaining.map((item, index) =>
          supabase
            .from("room_category_queue")
            .update({ position: index })
            .eq("id", item.id)
        )
      );
      
      return true;
    } catch (e) {
      console.error("Error removing from queue:", e);
      return false;
    } finally {
      setLoading(false);
    }
  }, [roomId, queue]);

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
    removeFromQueue,
    popFromQueue,
    clearQueue,
    reorderQueue,
    refetch: fetchQueue,
  };
}

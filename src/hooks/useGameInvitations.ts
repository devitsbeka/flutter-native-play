import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface GameInvitation {
  id: string;
  room_id: string;
  sender_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "declined" | "expired";
  created_at: string;
  expires_at: string;
  sender?: {
    nickname: string;
    avatar_url: string | null;
    country_code: string | null;
  };
  room?: {
    room_code: string;
    category_name: string | null;
  };
}

export function useGameInvitations() {
  const { user } = useAuth();
  const [pendingInvitations, setPendingInvitations] = useState<GameInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch pending invitations for current user
  const fetchInvitations = useCallback(async () => {
    if (!user) {
      setPendingInvitations([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("game_invitations")
        .select(`
          *,
          room:game_rooms(room_code, category_name)
        `)
        .eq("receiver_id", user.id)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch sender profiles separately
      const senderIds = [...new Set(data?.map(inv => inv.sender_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, nickname, avatar_url, country_code")
        .in("user_id", senderIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

      const invitationsWithProfiles: GameInvitation[] = data?.map(inv => ({
        ...inv,
        status: inv.status as GameInvitation["status"],
        sender: profileMap.get(inv.sender_id) || undefined,
      })) || [];

      setPendingInvitations(invitationsWithProfiles);
    } catch (error) {
      console.error("Error fetching invitations:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Send a game invitation
  const sendInvitation = useCallback(
    async (receiverId: string, roomId: string): Promise<boolean> => {
      if (!user) return false;

      try {
        // Check if there's already a pending invitation
        const { data: existing } = await supabase
          .from("game_invitations")
          .select("id")
          .eq("sender_id", user.id)
          .eq("receiver_id", receiverId)
          .eq("room_id", roomId)
          .eq("status", "pending")
          .gt("expires_at", new Date().toISOString())
          .single();

        if (existing) {
          toast.info("მოწვევა უკვე გაგზავნილია");
          return false;
        }

        const { error } = await supabase.from("game_invitations").insert({
          sender_id: user.id,
          receiver_id: receiverId,
          room_id: roomId,
        });

        if (error) throw error;
        toast.success("მოწვევა გაიგზავნა!");
        return true;
      } catch (error) {
        console.error("Error sending invitation:", error);
        toast.error("მოწვევა ვერ გაიგზავნა");
        return false;
      }
    },
    [user]
  );

  // Accept an invitation
  const acceptInvitation = useCallback(
    async (invitationId: string): Promise<string | null> => {
      if (!user) return null;

      try {
        // Get the invitation to find room code
        const { data: invitation, error: fetchError } = await supabase
          .from("game_invitations")
          .select("room_id, room:game_rooms(room_code)")
          .eq("id", invitationId)
          .single();

        if (fetchError) throw fetchError;

        // Update invitation status
        const { error } = await supabase
          .from("game_invitations")
          .update({ status: "accepted" })
          .eq("id", invitationId);

        if (error) throw error;

        // Remove from local state
        setPendingInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));

        // Return room code to join
        return (invitation.room as any)?.room_code || null;
      } catch (error) {
        console.error("Error accepting invitation:", error);
        toast.error("მოწვევის მიღება ვერ მოხერხდა");
        return null;
      }
    },
    [user]
  );

  // Decline an invitation
  const declineInvitation = useCallback(
    async (invitationId: string): Promise<boolean> => {
      if (!user) return false;

      try {
        const { error } = await supabase
          .from("game_invitations")
          .update({ status: "declined" })
          .eq("id", invitationId);

        if (error) throw error;

        // Remove from local state
        setPendingInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
        return true;
      } catch (error) {
        console.error("Error declining invitation:", error);
        return false;
      }
    },
    [user]
  );

  // Subscribe to real-time invitation updates
  useEffect(() => {
    if (!user) return;

    fetchInvitations();

    const channel = supabase
      .channel("game-invitations")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "game_invitations",
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload) => {
          const newInvitation = payload.new as GameInvitation;
          
          // Fetch sender profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("user_id, nickname, avatar_url, country_code")
            .eq("user_id", newInvitation.sender_id)
            .single();

          // Fetch room info
          const { data: room } = await supabase
            .from("game_rooms")
            .select("room_code, category_name")
            .eq("id", newInvitation.room_id)
            .single();

          const invitationWithData = {
            ...newInvitation,
            sender: profile || undefined,
            room: room || undefined,
          };

          setPendingInvitations((prev) => [invitationWithData, ...prev]);
          
          // Show toast notification
          toast.info(`${profile?.nickname || "მეგობარი"} გიწვევს თამაშში!`, {
            duration: 10000,
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_invitations",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as GameInvitation;
          if (updated.status !== "pending") {
            setPendingInvitations((prev) =>
              prev.filter((inv) => inv.id !== updated.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchInvitations]);

  return {
    pendingInvitations,
    loading,
    sendInvitation,
    acceptInvitation,
    declineInvitation,
    refreshInvitations: fetchInvitations,
  };
}

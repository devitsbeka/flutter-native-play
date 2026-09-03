import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/contexts/SoundContext";
import { useNotificationModal } from "@/hooks/useNotificationModal";
import { t as tStandalone } from "@/contexts/LanguageContext";

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
    /** What kind of room it is, so a yes opens the right page. */
    game_type_key?: string | null;
    game_mode?: string | null;
  };
}

export function useGameInvitations() {
  const { user } = useAuth();
  const { playSound } = useSound();
  const { notify } = useNotificationModal();
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
          room:game_rooms(room_code, category_name, game_type_key, game_mode)
        `)
        .eq("receiver_id", user.id)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch sender profiles separately
      const senderIds = [...new Set(data?.map(inv => inv.sender_id) || [])];
      let profileMap = new Map<string, any>();
      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, nickname, avatar_url, country_code")
          .in("user_id", senderIds);
        profileMap = new Map(profiles?.map(p => [p.user_id, p]));
      }

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

  // Add invited participant to room_participants table
  const addInvitedParticipant = useCallback(
    async (roomId: string, friendId: string, nickname: string, avatarUrl: string | null, countryCode: string | null) => {
      try {
        // Check if participant already exists
        const { data: existing } = await supabase
          .from("room_participants")
          .select("id")
          .eq("room_id", roomId)
          .eq("user_id", friendId)
          .maybeSingle();
        
        if (existing) {
          console.log("Participant already exists in room");
          return true;
        }
        
        const { error } = await supabase
          .from("room_participants")
          .insert({
            room_id: roomId,
            user_id: friendId,
            nickname: nickname,
            avatar_url: avatarUrl,
            country_code: countryCode || "GE",
            status: "invited",
            is_host: false,
          });
        
        if (error) {
          console.error("Error adding invited participant:", error);
          return false;
        }
        
        return true;
      } catch (error) {
        console.error("Error adding invited participant:", error);
        return false;
      }
    },
    []
  );

  // Send a game invitation
  const sendInvitation = useCallback(
    async (receiverId: string, roomId: string, allowResend = false): Promise<boolean> => {
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
          if (allowResend) {
            // Expire the old invitation to allow resending
            await supabase
              .from("game_invitations")
              .update({ status: "expired" })
              .eq("id", existing.id);
          } else {
            notify.info(tStandalone("extra.inviteAlreadySent"), { icon: "📧" });
            return false;
          }
        }

        const { data: created, error } = await supabase
          .from("game_invitations")
          .insert({
            sender_id: user.id,
            receiver_id: receiverId,
            room_id: roomId,
          })
          .select("id")
          .single();

        if (error) throw error;

        // Notification is created automatically by database trigger (notify_room_invite)
        // when participant is added to room_participants table. That is the
        // in-app bell only — it reaches a player who already has the app open.
        //
        // The push is what reaches someone who does not, which is the whole
        // point of inviting them. Sent by id and nothing else: the endpoint
        // re-reads the invitation, checks this caller is its sender, and
        // composes the text itself, so this cannot become a way to put
        // arbitrary words on someone's lock screen.
        //
        // Deliberately not awaited and never fatal. A friend who has push
        // switched off, or a delivery that fails, must not turn a sent
        // invitation into a failed one — the invitation is already in the
        // database and visible in their app.
        if (created?.id) {
          void supabase.functions
            .invoke("send-game-invite-push", { body: { invitationId: created.id } })
            .catch((e) => console.warn("[invite] push failed:", e));
        }

        notify.success(tStandalone("extra.inviteSentSuccess"), { icon: "✉️" });
        return true;
      } catch (error) {
        console.error("Error sending invitation:", error);
        notify.error(tStandalone("extra.inviteSendFailed"));
        return false;
      }
    },
    [user, notify]
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

        // Update participant status from 'invited' to 'joined' if they were pre-added
        await supabase
          .from("room_participants")
          .update({ status: "joined" })
          .eq("room_id", invitation.room_id)
          .eq("user_id", user.id);

        // Remove from local state
        setPendingInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));

        // Return room code to join
        return (invitation.room as any)?.room_code || null;
      } catch (error) {
        console.error("Error accepting invitation:", error);
        notify.error(tStandalone("extra.inviteAcceptFailed"));
        return null;
      }
    },
    [user, notify]
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

          // Fetch room info — its kind too, so a yes opens the right page
          // (routeForRoom): the arena, the couch, the board.
          const { data: room } = await supabase
            .from("game_rooms")
            .select("room_code, category_name, game_type_key, game_mode")
            .eq("id", newInvitation.room_id)
            .single();

          const invitationWithData = {
            ...newInvitation,
            sender: profile || undefined,
            room: room || undefined,
          };

          setPendingInvitations((prev) => [invitationWithData, ...prev]);

          // Play invitation sound
          playSound("game-invitation");

          // The card itself is GlobalGameInviteGate's: it watches this list
          // and shows whatever arrives on the same modal the host's doorstep
          // uses. Raising a second, differently-drawn popup from here is
          // what made one question look like two.
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
  }, [user, fetchInvitations, playSound]);

  return {
    pendingInvitations,
    loading,
    sendInvitation,
    addInvitedParticipant,
    acceptInvitation,
    declineInvitation,
    refreshInvitations: fetchInvitations,
  };
}

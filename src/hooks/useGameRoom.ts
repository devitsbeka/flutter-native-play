import { useState, useCallback } from "react";
import { t } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { generateRoomName, getDefaultRoomName } from "@/utils/roomNameGenerator";
import { getRandomGradient } from "@/config/roomGradients";
export type RoomStatus = "waiting" | "ready" | "playing" | "completed" | "cancelled";
export type ParticipantStatus = "joined" | "ready" | "playing" | "finished" | "disconnected";

export interface GameRoom {
  id: string;
  room_code: string;
  room_name: string | null;
  room_icon: string | null;
  host_user_id: string;
  status: RoomStatus;
  category_id: string | null;
  category_name: string | null;
  game_mode?: string | null;
  max_players: number;
  min_players: number;
  total_questions: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  // Async challenge fields
  game_type: "realtime" | "async";
  challenged_user_id: string | null;
  challenge_expires_at: string | null;
  challenger_completed_at: string | null;
}

export interface RoomParticipant {
  id: string;
  room_id: string;
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  country_code: string;
  joined_at: string;
  status: ParticipantStatus;
  score: number;
  current_question: number;
  is_host: boolean;
  total_wins?: number;
  total_rounds_played?: number;
}

// Generate a unique 6-character room code
function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function useGameRoom() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);

  const createRoom = useCallback(async (categoryId?: string, categoryName?: string): Promise<GameRoom | null> => {
    if (!user || !profile) {
      toast.error(t("extra.signInToCreateRoom"));
      return null;
    }

    setLoading(true);
    try {
      // Generate unique room code
      let roomCode = generateRoomCode();
      let attempts = 0;
      
      // Try up to 5 times to get a unique code
      while (attempts < 5) {
        const { data: existing } = await supabase
          .from("game_rooms")
          .select("id")
          .eq("room_code", roomCode)
          .maybeSingle();
        
        if (!existing) break;
        roomCode = generateRoomCode();
        attempts++;
      }

      // Generate AI-powered funny room name based on random icon
      const currentLanguage = localStorage.getItem('preferredLanguage') || 'en';
      let roomName = generateRoomName(currentLanguage); // fallback
      let roomIcon: string | null = null;
      
      try {
        const { data: nameData, error: nameError } = await supabase.functions.invoke('generate-room-name', {
          body: { language: currentLanguage }
        });
        if (!nameError && nameData?.name) {
          roomName = nameData.name;
          roomIcon = nameData.icon_url || null;
        }
      } catch (e) {
        console.log('Using fallback room name generator');
      }

      // Create the room with AI-generated name and gradient
      const { data: room, error: roomError } = await supabase
        .from("game_rooms")
        .insert({
          room_code: roomCode,
          host_user_id: user.id,
          category_id: categoryId || null,
          category_name: categoryName || null,
          status: "waiting" as RoomStatus,
          room_name: roomName,
          room_icon: roomIcon,
          background_gradient: getRandomGradient(),
          last_activity_at: new Date().toISOString(), // Ensure new rooms appear first
        })
        .select()
        .single();

      if (roomError) {
        console.error("Room creation error:", roomError);
        toast.error(t("extra.roomCreateFailed"));
        return null;
      }

      // Add host as participant
      const { error: participantError } = await supabase
        .from("room_participants")
        .insert({
          room_id: room.id,
          user_id: user.id,
          nickname: profile.nickname,
          avatar_url: profile.avatar_url,
          country_code: profile.country_code || "GE",
          is_host: true,
          status: "ready" as ParticipantStatus,
        });

      if (participantError) {
        console.error("Participant insert error:", participantError);
        // Clean up room if participant insert fails
        await supabase.from("game_rooms").delete().eq("id", room.id);
        toast.error(t("extra.roomCreateFailed"));
        return null;
      }

      const typedRoom: GameRoom = {
        id: room.id,
        room_code: room.room_code,
        room_name: room.room_name,
        room_icon: room.room_icon ?? null,
        host_user_id: room.host_user_id,
        status: room.status as RoomStatus,
        category_id: room.category_id,
        category_name: room.category_name,
        max_players: room.max_players ?? 10,
        min_players: room.min_players ?? 2,
        total_questions: room.total_questions ?? 5,
        created_at: room.created_at,
        started_at: room.started_at,
        completed_at: room.completed_at,
        game_type: room.game_type ?? "realtime",
        challenged_user_id: room.challenged_user_id,
        challenge_expires_at: room.challenge_expires_at,
        challenger_completed_at: room.challenger_completed_at,
      };

      setCurrentRoom(typedRoom);
      return typedRoom;
    } catch (error) {
      console.error("Create room error:", error);
      toast.error(t("extra.roomCreateFailed"));
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  const joinRoom = useCallback(async (roomCode: string): Promise<GameRoom | null> => {
    if (!user || !profile) {
      toast.error(t("extra.signInToJoinRoom"));
      return null;
    }

    setLoading(true);
    try {
      // Find the room - include completed rooms for rematch/re-entry
      const { data: room, error: roomError } = await supabase
        .from("game_rooms")
        .select("*")
        .eq("room_code", roomCode.toUpperCase())
        .in("status", ["waiting", "ready", "playing", "completed"])
        .maybeSingle();

      if (roomError || !room) {
        toast.error(t("extra.gmRoomNotFoundOrCancelled"));
        return null;
      }

      // Check if already in room (for re-entry)
      const { data: existingParticipant } = await supabase
        .from("room_participants")
        .select("id, status")
        .eq("room_id", room.id)
        .eq("user_id", user.id)
        .maybeSingle();

      // If this user has a reserved invited seat, allow them to join even if the match started.
      if (existingParticipant && (existingParticipant as any).status === 'invited') {
        await supabase
          .from('room_participants')
          .update({ status: 'joined' })
          .eq('room_id', room.id)
          .eq('user_id', user.id);
      }

      // If not already a participant and room is playing, block new joins
      if (!existingParticipant && room.status === "playing") {
        toast.error(t("extra.mpGameAlreadyStarted"));
        return null;
      }

      // Check participant count (only for new joins, not re-entry)
      if (!existingParticipant) {
        const { count } = await supabase
          .from("room_participants")
          .select("*", { count: "exact", head: true })
          .eq("room_id", room.id);

        if (count && count >= room.max_players) {
          toast.error(t("extra.mpRoomFull"));
          return null;
        }
      }

      // If already in room, just return for re-entry
      if (existingParticipant) {
        const typedRoom: GameRoom = {
          id: room.id,
          room_code: room.room_code,
          room_name: room.room_name,
          room_icon: room.room_icon ?? null,
          host_user_id: room.host_user_id,
          status: room.status as RoomStatus,
          category_id: room.category_id,
          category_name: room.category_name,
          max_players: room.max_players ?? 10,
          min_players: room.min_players ?? 2,
          total_questions: room.total_questions ?? 5,
          created_at: room.created_at,
          started_at: room.started_at,
          completed_at: room.completed_at,
          game_type: room.game_type ?? "realtime",
          challenged_user_id: room.challenged_user_id,
          challenge_expires_at: room.challenge_expires_at,
          challenger_completed_at: room.challenger_completed_at,
        };
        setCurrentRoom(typedRoom);
        toast.success(t("extra.gmRejoinedRoom"));
        return typedRoom;
      }

      // Join the room
      const { error: joinError } = await supabase
        .from("room_participants")
        .insert({
          room_id: room.id,
          user_id: user.id,
          nickname: profile.nickname,
          avatar_url: profile.avatar_url,
          country_code: profile.country_code || "GE",
          is_host: false,
          status: "joined" as ParticipantStatus,
        });

      if (joinError) {
        console.error("Join room error:", joinError);
        toast.error(t("extra.mpJoinFailed"));
        return null;
      }

      const typedRoom: GameRoom = {
        id: room.id,
        room_code: room.room_code,
        room_name: room.room_name,
        room_icon: room.room_icon ?? null,
        host_user_id: room.host_user_id,
        status: room.status as RoomStatus,
        category_id: room.category_id,
        category_name: room.category_name,
        max_players: room.max_players ?? 10,
        min_players: room.min_players ?? 2,
        total_questions: room.total_questions ?? 5,
        created_at: room.created_at,
        started_at: room.started_at,
        completed_at: room.completed_at,
        game_type: room.game_type ?? "realtime",
        challenged_user_id: room.challenged_user_id,
        challenge_expires_at: room.challenge_expires_at,
        challenger_completed_at: room.challenger_completed_at,
      };

      setCurrentRoom(typedRoom);
      toast.success(t("extra.gmJoinedRoom"));
      return typedRoom;
    } catch (error) {
      console.error("Join room error:", error);
      toast.error(t("extra.mpJoinFailed"));
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  const leaveRoom = useCallback(async (roomId: string) => {
    if (!user) return;

    try {
      const isHost = currentRoom?.host_user_id === user.id;

      // If host, try to transfer host status before leaving
      if (isHost) {
        // Find another participant to make host
        const { data: otherParticipants } = await supabase
          .from("room_participants")
          .select("user_id")
          .eq("room_id", roomId)
          .neq("user_id", user.id)
          .limit(1);

        if (otherParticipants && otherParticipants.length > 0) {
          // Transfer via the SECURITY DEFINER RPC — a direct is_host write
          // on another player's row is silently dropped by RLS.
          const newHostId = otherParticipants[0].user_id;
          const { error: transferError } = await supabase.rpc("transfer_room_host", {
            p_room_id: roomId,
            p_new_host: newHostId,
          });
          if (transferError) throw transferError;
        } else {
          // No other participants, cancel the room
          await supabase
            .from("game_rooms")
            .update({ status: "cancelled" as RoomStatus })
            .eq("id", roomId);
        }
      }

      // Remove participant
      await supabase
        .from("room_participants")
        .delete()
        .eq("room_id", roomId)
        .eq("user_id", user.id);

      setCurrentRoom(null);
    } catch (error) {
      console.error("Leave room error:", error);
    }
  }, [user, currentRoom]);

  const updateRoomStatus = useCallback(async (roomId: string, status: RoomStatus) => {
    const { error } = await supabase
      .from("game_rooms")
      .update({ 
        status,
        started_at: status === "playing" ? new Date().toISOString() : undefined,
        completed_at: status === "completed" ? new Date().toISOString() : undefined,
      })
      .eq("id", roomId);

    if (error) {
      console.error("Update room status error:", error);
      return false;
    }
    return true;
  }, []);

  const setParticipantReady = useCallback(async (roomId: string, ready: boolean) => {
    if (!user) return;

    await supabase
      .from("room_participants")
      .update({ status: (ready ? "ready" : "joined") as ParticipantStatus })
      .eq("room_id", roomId)
      .eq("user_id", user.id);
  }, [user]);

  const fetchRoom = useCallback(async (roomId: string): Promise<GameRoom | null> => {
    const { data, error } = await supabase
      .from("game_rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      room_code: data.room_code,
      room_name: data.room_name,
      room_icon: data.room_icon ?? null,
      host_user_id: data.host_user_id,
      status: data.status as RoomStatus,
      category_id: data.category_id,
      category_name: data.category_name,
      max_players: data.max_players ?? 10,
      min_players: data.min_players ?? 2,
      total_questions: data.total_questions ?? 5,
      created_at: data.created_at,
      started_at: data.started_at,
      completed_at: data.completed_at,
      game_type: data.game_type ?? "realtime",
      challenged_user_id: data.challenged_user_id,
      challenge_expires_at: data.challenge_expires_at,
      challenger_completed_at: data.challenger_completed_at,
    };
  }, []);

  return {
    loading,
    currentRoom,
    setCurrentRoom,
    createRoom,
    joinRoom,
    leaveRoom,
    updateRoomStatus,
    setParticipantReady,
    fetchRoom,
  };
}

import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/lib/toast";
import { t } from "@/contexts/LanguageContext";

export interface Friend {
  id: string;
  friendId: string;
  nickname: string;
  avatarUrl: string | null;
  animatedAvatarUrl: string | null;
  countryCode: string | null;
  status: "pending" | "accepted" | "blocked";
  isOnline?: boolean;
  isOutgoing: boolean;
}

interface FriendsContextValue {
  friends: Friend[];
  pendingRequests: Friend[];
  onlineUsers: Set<string>;
  loading: boolean;
  searchUsers: (query: string) => Promise<any[]>;
  sendFriendRequest: (friendId: string) => Promise<boolean>;
  acceptFriendRequest: (friendshipId: string) => Promise<boolean>;
  declineFriendRequest: (friendshipId: string) => Promise<boolean>;
  removeFriend: (friendshipId: string) => Promise<boolean>;
  refreshFriends: () => Promise<void>;
}

export const FriendsContext = createContext<FriendsContextValue | null>(null);

export function FriendsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const previousPendingCount = useRef(0);
  const isInitialLoad = useRef(true);

  const fetchFriends = useCallback(async () => {
    if (!user) {
      setFriends([]);
      setPendingRequests([]);
      setLoading(false);
      return;
    }

    try {
      const { data: friendships, error } = await supabase
        .from("friendships")
        .select("*")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      if (error) throw error;

      if (!friendships || friendships.length === 0) {
        setFriends([]);
        setPendingRequests([]);
        setLoading(false);
        return;
      }

      const friendIds = friendships.map(f =>
        f.user_id === user.id ? f.friend_id : f.user_id
      );

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, nickname, avatar_url, animated_avatar_url, country_code")
        .in("user_id", friendIds);

      if (profileError) throw profileError;

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const allFriends: Friend[] = friendships
        .filter(f => {
          // Filter out deleted accounts (no profile or "[წაშლილი]" nickname)
          const friendId = f.user_id === user.id ? f.friend_id : f.user_id;
          const profile = profileMap.get(friendId);
          if (!profile) return false;
          if (profile.nickname === "[წაშლილი]") return false;
          return true;
        })
        .map(f => {
          const friendId = f.user_id === user.id ? f.friend_id : f.user_id;
          const profile = profileMap.get(friendId)!;
          const isOutgoing = f.user_id === user.id;

          return {
            id: f.id,
            friendId,
            nickname: profile.nickname,
            avatarUrl: profile.avatar_url || null,
            animatedAvatarUrl: profile.animated_avatar_url || null,
            countryCode: profile.country_code || null,
            status: f.status as "pending" | "accepted" | "blocked",
            isOutgoing,
            isOnline: onlineUsers.has(friendId),
          };
        });

      const acceptedFriends = allFriends.filter(f => f.status === "accepted");
      const newPendingRequests = allFriends.filter(f => f.status === "pending" && !f.isOutgoing);

      if (!isInitialLoad.current && newPendingRequests.length > previousPendingCount.current) {
        const newRequest = newPendingRequests[newPendingRequests.length - 1];
        toast.info(`${t("extra.friendRequestReceived", { name: newRequest.nickname })} 🤝`, {
          duration: 5000,
          action: {
            label: t("extra.viewAction"),
            onClick: () => navigate("/notifications"),
          },
        });
      }

      previousPendingCount.current = newPendingRequests.length;
      isInitialLoad.current = false;

      setFriends(acceptedFriends);
      setPendingRequests(newPendingRequests);
    } catch (error) {
      console.error("Error fetching friends:", error);
    } finally {
      setLoading(false);
    }
  }, [user, onlineUsers]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  // Realtime subscription — single instance for the whole app
  useEffect(() => {
    if (!user) return;

    const channelId = `friendships-ctx-${user.id}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friendships",
        },
        async (payload) => {
          const row = (payload.new || payload.old) as { user_id?: string; friend_id?: string; status?: string } | null;

          if (!row || (row.user_id !== user.id && row.friend_id !== user.id)) {
            return;
          }

          if (payload.eventType === "INSERT" && row.friend_id === user.id && row.status === "pending") {
            const senderId = row.user_id;
            const { data: profile } = await supabase
              .from("profiles")
              .select("nickname")
              .eq("user_id", senderId)
              .maybeSingle();

            const senderName = profile?.nickname || t("extra.someone");
            toast.info(t("extra.friendRequestReceived", { name: senderName }), {
              duration: 5000,
            });
          }

          if (payload.eventType === "UPDATE" && row.user_id === user.id) {
            const oldRow = payload.old as { status?: string } | null;
            if (row.status === "accepted" && oldRow?.status === "pending") {
              const friendId = row.friend_id;
              const { data: profile } = await supabase
                .from("profiles")
                .select("nickname")
                .eq("user_id", friendId)
                .maybeSingle();

              const friendName = profile?.nickname || t("extra.playerDefault");
              toast.success(t("extra.friendRequestAccepted", { name: friendName }), {
                duration: 5000,
              });
            }
          }

          fetchFriends();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchFriends]);

  // Presence — single instance
  useEffect(() => {
    if (!user) return;

    const presenceChannel = supabase.channel("online-users", {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const onlineIds = new Set<string>();
        Object.keys(state).forEach((key) => {
          onlineIds.add(key);
        });
        setOnlineUsers(onlineIds);
      })
      .on("presence", { event: "join" }, ({ key }) => {
        setOnlineUsers(prev => new Set([...prev, key]));
      })
      .on("presence", { event: "leave" }, ({ key }) => {
        setOnlineUsers(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [user]);

  // Update friends with online status
  useEffect(() => {
    setFriends(prev =>
      prev.map(friend => ({
        ...friend,
        isOnline: onlineUsers.has(friend.friendId),
      }))
    );
  }, [onlineUsers]);

  const searchUsers = useCallback(async (query: string) => {
    if (!user || query.length < 2) return [];
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, nickname, avatar_url, country_code")
        .ilike("nickname", `%${query}%`)
        .neq("user_id", user.id)
        .neq("nickname", "[წაშლილი]")
        .limit(10);
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error searching users:", error);
      return [];
    }
  }, [user]);

  // Tell the other player their lock screen's worth of news. Fire-and-forget
  // like the game-invite push: the friendship row is already written, and a
  // push that fails to send must not fail the action it announces. The
  // server re-reads the row and composes the text itself — the id is all it
  // will accept.
  const announceFriendPush = (kind: "friend_request" | "friend_accept", friendshipId: string) => {
    supabase.functions
      .invoke("send-social-push", { body: { kind, friendshipId } })
      .catch(() => {});
  };

  const sendFriendRequest = useCallback(async (friendId: string) => {
    if (!user) return false;
    try {
      const { data: existing } = await supabase
        .from("friendships")
        .select("id, status, user_id")
        .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`)
        .maybeSingle();

      if (existing) {
        if (existing.status === "accepted") {
          toast.info(t("extra.alreadyFriends"));
        } else if (existing.status === "pending") {
          if (existing.user_id === friendId) {
            const { error: acceptError } = await supabase
              .from("friendships")
              .update({
                status: "accepted",
                accepted_at: new Date().toISOString(),
              })
              .eq("id", existing.id);

            if (acceptError) {
              console.error("Error auto-accepting friend request:", acceptError);
              toast.error(t("extra.requestAcceptFailed"));
              return false;
            }
            announceFriendPush("friend_accept", existing.id);
            toast.success(t("extra.friendAdded"));
            await fetchFriends();
            return true;
          } else {
            toast.info(t("extra.requestAlreadySent"));
          }
        }
        return false;
      }

      const { data: created, error } = await supabase
        .from("friendships")
        .insert({
          user_id: user.id,
          friend_id: friendId,
          status: "pending",
        })
        .select("id")
        .single();
      if (error) throw error;
      if (created) announceFriendPush("friend_request", created.id);
      toast.success(t("extra.requestSent"));
      return true;
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast.error(t("extra.requestSendFailed"));
      return false;
    }
  }, [user, fetchFriends]);

  const acceptFriendRequest = useCallback(async (friendshipId: string) => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from("friendships")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
        })
        .eq("id", friendshipId);
      if (error) throw error;
      announceFriendPush("friend_accept", friendshipId);
      await fetchFriends();
      return true;
    } catch (error) {
      console.error("Error accepting friend request:", error);
      toast.error(t("extra.requestAcceptFailed"));
      return false;
    }
  }, [user, fetchFriends]);

  const declineFriendRequest = useCallback(async (friendshipId: string) => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendshipId);
      if (error) throw error;
      toast.success(t("extra.requestDeclined"));
      await fetchFriends();
      return true;
    } catch (error) {
      console.error("Error declining friend request:", error);
      toast.error(t("extra.requestDeclineFailed"));
      return false;
    }
  }, [user, fetchFriends]);

  const removeFriend = useCallback(async (friendshipId: string) => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendshipId);
      if (error) throw error;
      toast.success(t("extra.friendRemoved"));
      await fetchFriends();
      return true;
    } catch (error) {
      console.error("Error removing friend:", error);
      toast.error(t("extra.friendRemoveFailed"));
      return false;
    }
  }, [user, fetchFriends]);

  const value = useMemo(
    () => ({
      friends,
      pendingRequests,
      onlineUsers,
      loading,
      searchUsers,
      sendFriendRequest,
      acceptFriendRequest,
      declineFriendRequest,
      removeFriend,
      refreshFriends: fetchFriends,
    }),
    [
      friends,
      pendingRequests,
      onlineUsers,
      loading,
      searchUsers,
      sendFriendRequest,
      acceptFriendRequest,
      declineFriendRequest,
      removeFriend,
      fetchFriends,
    ]
  );

  return (
    <FriendsContext.Provider value={value}>
      {children}
    </FriendsContext.Provider>
  );
}

export function useFriends() {
  const ctx = useContext(FriendsContext);
  if (!ctx) throw new Error("useFriends must be used within FriendsProvider");
  return ctx;
}

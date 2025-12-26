import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Friend {
  id: string;
  friendId: string;
  nickname: string;
  avatarUrl: string | null;
  countryCode: string | null;
  status: "pending" | "accepted" | "blocked";
  isOnline?: boolean;
  isOutgoing: boolean; // true if current user sent the request
}

export function useFriends() {
  const { user } = useAuth();
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
      // Get all friendships where user is involved
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

      // Get unique friend IDs
      const friendIds = friendships.map(f => 
        f.user_id === user.id ? f.friend_id : f.user_id
      );

      // Fetch profiles for all friends
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, nickname, avatar_url, country_code")
        .in("user_id", friendIds);

      if (profileError) throw profileError;

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const allFriends: Friend[] = friendships.map(f => {
        const friendId = f.user_id === user.id ? f.friend_id : f.user_id;
        const profile = profileMap.get(friendId);
        const isOutgoing = f.user_id === user.id;

        return {
          id: f.id,
          friendId,
          nickname: profile?.nickname || "მოთამაშე",
          avatarUrl: profile?.avatar_url || null,
          countryCode: profile?.country_code || null,
          status: f.status as "pending" | "accepted" | "blocked",
          isOutgoing,
          isOnline: onlineUsers.has(friendId),
        };
      });

      const acceptedFriends = allFriends.filter(f => f.status === "accepted");
      const newPendingRequests = allFriends.filter(f => f.status === "pending" && !f.isOutgoing);
      
      // Show notification for new friend requests (not on initial load)
      if (!isInitialLoad.current && newPendingRequests.length > previousPendingCount.current) {
        const newRequest = newPendingRequests[newPendingRequests.length - 1];
        toast.info(`${newRequest.nickname} გთხოვს მეგობრობას! 🤝`, {
          duration: 5000,
          action: {
            label: "ნახვა",
            onClick: () => {
              // Navigate to team page handled by parent
            },
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

  // Subscribe to friendship changes with notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("friendships-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "friendships",
          filter: `friend_id=eq.${user.id}`,
        },
        async (payload) => {
          // New friend request received - fetch sender's profile for notification
          const senderId = payload.new.user_id;
          const { data: profile } = await supabase
            .from("profiles")
            .select("nickname")
            .eq("user_id", senderId)
            .maybeSingle();
          
          const senderName = profile?.nickname || "ვიღაც";
          toast.info(`${senderName} გთხოვს მეგობრობას! 🤝`, {
            duration: 5000,
          });
          
          fetchFriends();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "friendships",
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          // Friend request was accepted
          if (payload.new.status === "accepted" && payload.old?.status === "pending") {
            const friendId = payload.new.friend_id;
            const { data: profile } = await supabase
              .from("profiles")
              .select("nickname")
              .eq("user_id", friendId)
              .maybeSingle();
            
            const friendName = profile?.nickname || "მოთამაშე";
            toast.success(`${friendName} მიიღო შენი მოთხოვნა! 🎉`, {
              duration: 5000,
            });
          }
          fetchFriends();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friendships",
          filter: `friend_id=eq.${user.id}`,
        },
        () => fetchFriends()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchFriends]);

  // Presence tracking for online status
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

  // Update friends with online status when onlineUsers changes
  useEffect(() => {
    setFriends(prev => 
      prev.map(friend => ({
        ...friend,
        isOnline: onlineUsers.has(friend.friendId),
      }))
    );
  }, [onlineUsers]);

  const searchUsers = async (query: string) => {
    if (!user || query.length < 2) return [];

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, nickname, avatar_url, country_code")
        .ilike("nickname", `%${query}%`)
        .neq("user_id", user.id)
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error searching users:", error);
      return [];
    }
  };

  const sendFriendRequest = async (friendId: string) => {
    if (!user) return false;

    try {
      // Check if friendship already exists
      const { data: existing } = await supabase
        .from("friendships")
        .select("id, status")
        .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`)
        .maybeSingle();

      if (existing) {
        if (existing.status === "accepted") {
          toast.info("უკვე მეგობრები ხართ");
        } else if (existing.status === "pending") {
          toast.info("მოთხოვნა უკვე გაგზავნილია");
        }
        return false;
      }

      const { error } = await supabase.from("friendships").insert({
        user_id: user.id,
        friend_id: friendId,
        status: "pending",
      });

      if (error) throw error;

      toast.success("მოთხოვნა გაიგზავნა!");
      return true;
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast.error("მოთხოვნის გაგზავნა ვერ მოხერხდა");
      return false;
    }
  };

  const acceptFriendRequest = async (friendshipId: string) => {
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

      toast.success("მეგობარი დაემატა!");
      await fetchFriends();
      return true;
    } catch (error) {
      console.error("Error accepting friend request:", error);
      toast.error("მოთხოვნის მიღება ვერ მოხერხდა");
      return false;
    }
  };

  const declineFriendRequest = async (friendshipId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendshipId);

      if (error) throw error;

      toast.success("მოთხოვნა უარყოფილია");
      await fetchFriends();
      return true;
    } catch (error) {
      console.error("Error declining friend request:", error);
      toast.error("მოთხოვნის უარყოფა ვერ მოხერხდა");
      return false;
    }
  };

  const removeFriend = async (friendshipId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendshipId);

      if (error) throw error;

      toast.success("მეგობარი წაიშალა");
      await fetchFriends();
      return true;
    } catch (error) {
      console.error("Error removing friend:", error);
      toast.error("წაშლა ვერ მოხერხდა");
      return false;
    }
  };

  return {
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
  };
}

import { useState, useEffect } from "react";
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
  const [loading, setLoading] = useState(true);

  const fetchFriends = async () => {
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
        };
      });

      setFriends(allFriends.filter(f => f.status === "accepted"));
      setPendingRequests(allFriends.filter(f => f.status === "pending" && !f.isOutgoing));
    } catch (error) {
      console.error("Error fetching friends:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, [user]);

  // Subscribe to friendship changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("friendships-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friendships",
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchFriends()
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
  }, [user]);

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
    loading,
    searchUsers,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
    refreshFriends: fetchFriends,
  };
}

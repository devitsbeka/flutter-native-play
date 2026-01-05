import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type ReportType = "spam" | "harassment" | "inappropriate" | "cheating" | "other";

export interface UserReport {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  report_type: ReportType;
  message_id?: string;
  room_id?: string;
  description?: string;
  status: string;
  created_at: string;
}

export interface UserBlock {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export function useUserModeration() {
  const { user } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch blocked users on mount
  useEffect(() => {
    if (!user) {
      setBlockedUsers([]);
      setLoading(false);
      return;
    }

    const fetchBlockedUsers = async () => {
      try {
        const { data, error } = await supabase
          .from("user_blocks")
          .select("blocked_id")
          .eq("blocker_id", user.id);

        if (error) throw error;
        setBlockedUsers(data?.map(b => b.blocked_id) || []);
      } catch (error) {
        console.error("Error fetching blocked users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBlockedUsers();
  }, [user]);

  // Report a user
  const reportUser = useCallback(async (
    reportedUserId: string,
    reportType: ReportType,
    description?: string,
    messageId?: string,
    roomId?: string
  ): Promise<boolean> => {
    if (!user) {
      toast.error("გთხოვთ გაიაროთ ავტორიზაცია");
      return false;
    }

    if (reportedUserId === user.id) {
      toast.error("საკუთარ თავს ვერ დაარეპორტებთ");
      return false;
    }

    try {
      const { error } = await supabase
        .from("user_reports")
        .insert({
          reporter_id: user.id,
          reported_user_id: reportedUserId,
          report_type: reportType,
          description,
          message_id: messageId,
          room_id: roomId,
        });

      if (error) throw error;

      toast.success("რეპორტი გაიგზავნა", {
        description: "ჩვენ გადავხედავთ თქვენს რეპორტს მალე",
      });
      return true;
    } catch (error) {
      console.error("Error reporting user:", error);
      toast.error("რეპორტის გაგზავნა ვერ მოხერხდა");
      return false;
    }
  }, [user]);

  // Block a user
  const blockUser = useCallback(async (blockedId: string): Promise<boolean> => {
    if (!user) {
      toast.error("გთხოვთ გაიაროთ ავტორიზაცია");
      return false;
    }

    if (blockedId === user.id) {
      toast.error("საკუთარ თავს ვერ დაბლოკავთ");
      return false;
    }

    try {
      const { error } = await supabase
        .from("user_blocks")
        .insert({
          blocker_id: user.id,
          blocked_id: blockedId,
        });

      if (error) {
        // Handle unique constraint violation (already blocked)
        if (error.code === "23505") {
          toast.info("მომხმარებელი უკვე დაბლოკილია");
          return true;
        }
        throw error;
      }

      setBlockedUsers(prev => [...prev, blockedId]);
      toast.success("მომხმარებელი დაბლოკილია");
      return true;
    } catch (error) {
      console.error("Error blocking user:", error);
      toast.error("დაბლოკვა ვერ მოხერხდა");
      return false;
    }
  }, [user]);

  // Unblock a user
  const unblockUser = useCallback(async (blockedId: string): Promise<boolean> => {
    if (!user) {
      toast.error("გთხოვთ გაიაროთ ავტორიზაცია");
      return false;
    }

    try {
      const { error } = await supabase
        .from("user_blocks")
        .delete()
        .eq("blocker_id", user.id)
        .eq("blocked_id", blockedId);

      if (error) throw error;

      setBlockedUsers(prev => prev.filter(id => id !== blockedId));
      toast.success("მომხმარებელი განბლოკილია");
      return true;
    } catch (error) {
      console.error("Error unblocking user:", error);
      toast.error("განბლოკვა ვერ მოხერხდა");
      return false;
    }
  }, [user]);

  // Check if a user is blocked
  const isUserBlocked = useCallback((userId: string): boolean => {
    return blockedUsers.includes(userId);
  }, [blockedUsers]);

  // Filter out blocked users from a list
  const filterBlockedUsers = useCallback(<T extends { user_id?: string; sender_id?: string }>(
    items: T[]
  ): T[] => {
    return items.filter(item => {
      const userId = item.user_id || item.sender_id;
      return userId ? !blockedUsers.includes(userId) : true;
    });
  }, [blockedUsers]);

  return {
    blockedUsers,
    loading,
    reportUser,
    blockUser,
    unblockUser,
    isUserBlocked,
    filterBlockedUsers,
  };
}

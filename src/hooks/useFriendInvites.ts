import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { callRpc } from "@/integrations/supabase/rpc";

export interface FriendInvite {
  id: string;
  invited_email: string;
  invited_user_id: string | null;
  status: string;
  tier_granted: string;
  referral_code: string | null;
  created_at: string;
  accepted_at: string | null;
  expires_at: string | null;
}

export function useFriendInvites() {
  const { user } = useAuth();
  const [invites, setInvites] = useState<FriendInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvites = useCallback(async () => {
    if (!user) {
      setInvites([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('friend_invites')
        .select('*')
        .eq('inviter_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvites(data || []);
    } catch (error) {
      console.error('Error fetching invites:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const generateReferralCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const createEmailInvite = async (email: string, tierGranted: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('friend_invites')
        .insert({
          inviter_id: user.id,
          invited_email: email,
          tier_granted: tierGranted,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });

      if (error) throw error;
      
      toast.success("მოწვევა გაიგზავნა!");
      await fetchInvites();
      return true;
    } catch (error) {
      console.error('Error creating email invite:', error);
      toast.error("შეცდომა მოწვევის გაგზავნისას");
      return false;
    }
  };

  const createLinkInvite = async (_tierGranted: string): Promise<string | null> => {
    if (!user) return null;

    try {
      // Own referral code. Read through the RPC because the column is no
      // longer selectable by any client role - see profileColumns.ts.
      const { data: mine } = await callRpc<{ referral_code?: string | null }>('get_my_private_profile');
      const existingCode = mine?.referral_code;
      if (existingCode) {
        return existingCode;
      }

      // Generate and save a new permanent code
      const referralCode = generateReferralCode();
      const { error } = await supabase
        .from('profiles')
        .update({ referral_code: referralCode } as any)
        .eq('user_id', user.id);

      if (error) throw error;
      
      return referralCode;
    } catch (error) {
      console.error('Error creating link invite:', error);
      toast.error("შეცდომა ლინკის შექმნისას");
      return null;
    }
  };

  const getInviteStatus = (invite: FriendInvite): 'pending' | 'accepted' | 'expired' => {
    if (invite.status === 'accepted' || invite.invited_user_id) {
      return 'accepted';
    }
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return 'expired';
    }
    return 'pending';
  };

  return {
    invites,
    loading,
    fetchInvites,
    createEmailInvite,
    createLinkInvite,
    getInviteStatus,
  };
}

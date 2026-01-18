import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, Mail, Send, Check, Clock, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ProTier, PRO_TIERS } from "./ProPlansSection";

interface ProInviteFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  invitesRemaining: number;
  currentTier?: ProTier | null;
}

interface FriendInvite {
  id: string;
  invited_email: string;
  status: string;
  created_at: string;
}

export function ProInviteFriendsModal({ 
  isOpen, 
  onClose, 
  invitesRemaining,
  currentTier 
}: ProInviteFriendsModalProps) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sentInvites, setSentInvites] = useState<FriendInvite[]>([]);

  const tierConfig = PRO_TIERS.find(t => t.id === currentTier);

  const handleSendInvite = async () => {
    if (!email || !user) return;
    
    if (invitesRemaining <= 0) {
      toast.error("მოწვევები ამოიწურა");
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase
        .from('friend_invites')
        .insert({
          inviter_id: user.id,
          invited_email: email,
          tier_granted: `friend_${currentTier}`,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });

      if (error) throw error;

      // Update remaining invites
      await supabase
        .from('vip_subscriptions')
        .update({ friend_invites_remaining: invitesRemaining - 1 })
        .eq('user_id', user.id);

      toast.success("მოწვევა გაიგზავნა!");
      setEmail("");
      
      // Add to local list
      setSentInvites(prev => [...prev, {
        id: crypto.randomUUID(),
        invited_email: email,
        status: 'pending',
        created_at: new Date().toISOString()
      }]);
    } catch (error) {
      console.error('Error sending invite:', error);
      toast.error("შეცდომა მოწვევის გაგზავნისას");
    } finally {
      setSending(false);
    }
  };

  const friendBenefits = [
    "ტრივიების შექმნა (3/თვეში)",
    "ოთახებში მონაწილეობა",
    "პოსტების გამოქვეყნება",
    "მოქმედებს 1 თვე"
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: "spring", damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-card rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-hidden"
          >
            {/* Header */}
            <div className="relative p-6 pb-4">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
              
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center",
                  tierConfig?.gradient || "from-purple-500 to-indigo-600"
                )}>
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">მეგობრების მოწვევა</h2>
                  <p className="text-sm text-muted-foreground">
                    {invitesRemaining} მოწვევა დარჩენილი
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 pb-6 space-y-5 overflow-y-auto max-h-[60vh]">
              {/* Friend Benefits Info */}
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Gift className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">მეგობარი მიიღებს:</span>
                </div>
                <div className="space-y-2">
                  {friendBenefits.map((benefit, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="w-3 h-3 text-primary" />
                      {benefit}
                    </div>
                  ))}
                </div>
              </div>

              {/* Email Input */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  მეგობრის ელ-ფოსტა
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="friend@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      disabled={invitesRemaining <= 0}
                    />
                  </div>
                  <Button
                    onClick={handleSendInvite}
                    disabled={!email || sending || invitesRemaining <= 0}
                    className="gap-2"
                  >
                    <Send className="w-4 h-4" />
                    გაგზავნა
                  </Button>
                </div>
              </div>

              {/* Sent Invites */}
              {sentInvites.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-foreground">გაგზავნილი მოწვევები</h4>
                  <div className="space-y-2">
                    {sentInvites.map((invite) => (
                      <div 
                        key={invite.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-xl"
                      >
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">{invite.invited_email}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          მოლოდინში
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Invites Left Warning */}
              {invitesRemaining <= 0 && (
                <div className="bg-destructive/10 text-destructive rounded-xl p-4 text-center">
                  <p className="text-sm font-medium">მოწვევები ამოიწურა</p>
                  <p className="text-xs mt-1 opacity-80">
                    განაახლეთ PRO+ ან PRO Elite-ზე მეტი მოწვევისთვის
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

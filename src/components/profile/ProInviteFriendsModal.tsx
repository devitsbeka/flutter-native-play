import { siteUrl } from "@/config/site";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, Mail, Send, Check, Gift, Link2, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useFriendInvites } from "@/hooks/useFriendInvites";
import { toast } from "sonner";
import { ProTier, PRO_TIERS } from "./ProPlansSection";
import { useLanguage } from "@/contexts/LanguageContext";

interface ProInviteFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  invitesRemaining: number;
  currentTier?: ProTier | null;
  onInviteSent?: () => void;
}

export function ProInviteFriendsModal({ 
  isOpen, onClose, invitesRemaining, currentTier, onInviteSent
}: ProInviteFriendsModalProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { createEmailInvite, createLinkInvite } = useFriendInvites();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);

  const tierConfig = PRO_TIERS.find(t => t.id === currentTier);

  const handleSendEmailInvite = async () => {
    if (!email || !user) return;
    if (invitesRemaining <= 0) { toast.error(t("extra.invitesExpired")); return; }
    setSending(true);
    try {
      const success = await createEmailInvite(email, `friend_${currentTier}`);
      if (success) { setEmail(""); onInviteSent?.(); }
    } finally { setSending(false); }
  };

  const handleGenerateLink = async () => {
    if (!user) return;
    if (invitesRemaining <= 0) { toast.error(t("extra.invitesExpired")); return; }
    setGeneratingLink(true);
    try {
      const referralCode = await createLinkInvite(`friend_${currentTier}`);
      if (referralCode) {
        const link = siteUrl(`/auth?mode=signup&ref=${referralCode}`);
        setGeneratedLink(link);
        onInviteSent?.();
        toast.success(t("extra.linkCreated"));
      }
    } finally { setGeneratingLink(false); }
  };

  const handleCopyLink = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      toast.success(t("extra.linkCopiedInvite"));
    } catch { toast.error(t("extra.copyErrorInvite")); }
  };

  const handleShare = async () => {
    if (!generatedLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: t("extra.joinTriviani"),
          text: t("extra.getProFree"),
          url: generatedLink,
        });
      } catch { /* cancelled */ }
    } else { handleCopyLink(); }
  };

  const friendBenefits = [
    t("extra.inviteBenefitTrivia"),
    t("extra.inviteBenefitRooms"),
    t("extra.inviteBenefitPosts"),
    t("extra.inviteBenefitDuration"),
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
              <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
              <div className="flex items-center gap-3">
                <div className={cn("w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center", tierConfig?.gradient || "from-purple-500 to-indigo-600")} style={{ background: tierConfig?.gradient }}>
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{t("extra.inviteFriendsHeader")}</h2>
                  <p className="text-sm text-muted-foreground">{t("extra.invitesRemainingLabel", { count: String(invitesRemaining) })}</p>
                </div>
              </div>
            </div>

            <div className="px-6 pb-6 space-y-5 overflow-y-auto max-h-[60vh]">
              {/* Friend Benefits */}
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Gift className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{t("extra.friendWillReceive")}</span>
                </div>
                <div className="space-y-2">
                  {friendBenefits.map((benefit, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="w-3 h-3 text-primary" /> {benefit}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="email" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="email" className="gap-2"><Mail className="w-4 h-4" />{t("extra.byEmailTab")}</TabsTrigger>
                  <TabsTrigger value="link" className="gap-2"><Link2 className="w-4 h-4" />{t("extra.byLinkTab")}</TabsTrigger>
                </TabsList>

                <TabsContent value="email" className="space-y-3 mt-4">
                  <label className="text-sm font-medium text-foreground">{t("extra.friendEmailLabel")}</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input type="email" placeholder="friend@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" disabled={invitesRemaining <= 0} />
                    </div>
                    <Button onClick={handleSendEmailInvite} disabled={!email || sending || invitesRemaining <= 0} className="gap-2">
                      <Send className="w-4 h-4" /> {t("extra.sendBtn")}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="link" className="space-y-4 mt-4">
                  {!generatedLink ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground mb-4">{t("extra.createLinkDesc")}</p>
                      <Button onClick={handleGenerateLink} disabled={generatingLink || invitesRemaining <= 0} className="gap-2">
                        <Link2 className="w-4 h-4" />
                        {generatingLink ? t("extra.inviteLinkCreating") : t("extra.createLinkBtn")}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">{t("extra.yourInviteLink")}</label>
                        <div className="relative">
                          <Input value={generatedLink} readOnly className="pr-20 text-sm font-mono" />
                          <Button variant="ghost" size="sm" onClick={handleCopyLink} className="absolute right-1 top-1/2 -translate-y-1/2 h-8 gap-1">
                            <Copy className="w-4 h-4" /> {t("extra.copyBtn")}
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleShare} className="flex-1 gap-2" variant="secondary">
                          <Share2 className="w-4 h-4" /> {t("extra.shareBtn")}
                        </Button>
                        <Button onClick={() => setGeneratedLink(null)} variant="outline" className="gap-2" disabled={invitesRemaining <= 0}>
                          <Link2 className="w-4 h-4" /> {t("extra.newLinkBtn")}
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {invitesRemaining <= 0 && (
                <div className="bg-destructive/10 text-destructive rounded-xl p-4 text-center">
                  <p className="text-sm font-medium">{t("extra.invitesExpiredTitle")}</p>
                  <p className="text-xs mt-1 opacity-80">{t("extra.invitesExpiredDesc")}</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

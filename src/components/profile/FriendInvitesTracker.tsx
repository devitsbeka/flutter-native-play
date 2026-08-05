import { motion } from "framer-motion";
import { Mail, Link2, Clock, CheckCircle2, XCircle, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFriendInvites, FriendInvite } from "@/hooks/useFriendInvites";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";
import { ka } from "date-fns/locale";

interface FriendInvitesTrackerProps {
  className?: string;
}

export function FriendInvitesTracker({ className }: FriendInvitesTrackerProps) {
  const { t } = useLanguage();
  const { invites, loading, getInviteStatus } = useFriendInvites();

  if (loading) {
    return (
      <div className={cn("space-y-3", className)}>
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          {t("extra.myInvitations")}
        </h3>
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-muted/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (invites.length === 0) {
    return (
      <div className={cn("space-y-3", className)}>
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          {t("extra.myInvitations")}
        </h3>
        <div className="bg-muted/30 rounded-xl p-6 text-center">
          <p className="text-muted-foreground text-sm">
            {t("extra.noInvitesSent")}
          </p>
        </div>
      </div>
    );
  }

  const getStatusConfig = (status: 'pending' | 'accepted' | 'expired') => {
    switch (status) {
      case 'accepted':
        return {
          label: t("extra.acceptedStatus"),
          icon: CheckCircle2,
          bgColor: 'bg-green-500/10',
          textColor: 'text-green-500',
          borderColor: 'border-green-500/20',
        };
      case 'expired':
        return {
          label: t("extra.expiredStatus"),
          icon: XCircle,
          bgColor: 'bg-destructive/10',
          textColor: 'text-destructive',
          borderColor: 'border-destructive/20',
        };
      default:
        return {
          label: t("extra.pendingStatus"),
          icon: Clock,
          bgColor: 'bg-amber-500/10',
          textColor: 'text-amber-500',
          borderColor: 'border-amber-500/20',
        };
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'd MMM, yyyy', { locale: ka });
    } catch {
      return dateString;
    }
  };

  const isLinkInvite = (invite: FriendInvite) => {
    return invite.referral_code && invite.invited_email.includes('@placeholder.local');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("space-y-3", className)}
    >
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <Mail className="w-5 h-5 text-primary" />
        {t("extra.myInvitations")}
        <span className="text-sm font-normal text-muted-foreground">
          ({invites.length})
        </span>
      </h3>

      <div className="space-y-2">
        {invites.map((invite, index) => {
          const status = getInviteStatus(invite);
          const statusConfig = getStatusConfig(status);
          const StatusIcon = statusConfig.icon;
          const isLink = isLinkInvite(invite);

          return (
            <motion.div
              key={invite.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "flex items-center justify-between p-3 rounded-xl border",
                "bg-card/50 backdrop-blur-sm",
                statusConfig.borderColor
              )}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                  statusConfig.bgColor
                )}>
                  {isLink ? (
                    <Link2 className={cn("w-5 h-5", statusConfig.textColor)} />
                  ) : (
                    <Mail className={cn("w-5 h-5", statusConfig.textColor)} />
                  )}
                </div>
                
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {isLink ? (
                      <span className="flex items-center gap-1">
                        <span className="text-muted-foreground">{t("extra.linkLabel")}</span>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {invite.referral_code}
                        </code>
                      </span>
                    ) : (
                      invite.invited_email
                    )}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Calendar className="w-3 h-3" />
                    {status === 'accepted' && invite.accepted_at ? (
                      <span>{t("extra.joinedDateLabel")} {formatDate(invite.accepted_at)}</span>
                    ) : (
                      <span>{t("extra.sentDateLabel")} {formatDate(invite.created_at)}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0",
                statusConfig.bgColor,
                statusConfig.textColor
              )}>
                <StatusIcon className="w-3.5 h-3.5" />
                {statusConfig.label}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

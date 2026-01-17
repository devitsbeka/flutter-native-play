import { motion } from "framer-motion";
import { Tv, Airplay, Cast, MonitorSmartphone } from "lucide-react";
import { GameInvitationsSection } from "./GameInvitationsSection";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Capacitor } from "@capacitor/core";

interface TeamRightSidebarProps {
  onAcceptInvitation: (invitationId: string) => Promise<string | null>;
  onJoinRoom: (roomCode: string) => void;
  onOpenTV: () => void;
}

export function TeamRightSidebar({ 
  onAcceptInvitation, 
  onJoinRoom,
  onOpenTV 
}: TeamRightSidebarProps) {
  const { t } = useLanguage();
  const platform = Capacitor.getPlatform();
  const TVIcon = platform === 'ios' ? Airplay : platform === 'android' ? Cast : MonitorSmartphone;

  return (
    <aside className="hidden xl:flex flex-col w-[320px] min-w-[320px] h-full border-l border-border/50 bg-background/50 backdrop-blur-sm">
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Game Invitations Widget */}
        <GameInvitationsSection
          onAcceptInvitation={onAcceptInvitation}
          onJoinRoom={onJoinRoom}
        />

        {/* Play on TV Widget */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2 text-primary">
            <Tv className="w-4 h-4" />
            <span className="text-sm font-bold tracking-wide">
              {t('tv.playOnTV')}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground">
                <TVIcon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground text-sm">
                  {t('tv.castToTV')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('tv.playWithFriendsOnBigScreen')}
                </p>
              </div>
            </div>
            
            <ChunkyButton
              variant="primary"
              size="sm"
              onClick={onOpenTV}
              className="w-full justify-center"
            >
              <TVIcon className="w-4 h-4 mr-2" />
              {t('tv.connectTV')}
            </ChunkyButton>
          </div>
        </motion.div>
      </div>
    </aside>
  );
}

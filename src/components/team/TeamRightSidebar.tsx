import { motion } from "framer-motion";
import { Tv, Users, Trophy, Sparkles, ChevronRight } from "lucide-react";
import { GameInvitationsSection } from "./GameInvitationsSection";
import { useLanguage } from "@/contexts/LanguageContext";
import tvIcon from "@/assets/tv-3d-icon.png";

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

  return (
    <aside className="hidden xl:flex flex-col w-[320px] min-w-[320px] h-full border-l border-border/50 bg-background/50 backdrop-blur-sm">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
              TV-ზე თამაში
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 border border-border/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center">
                <img src={tvIcon} alt="TV" className="w-14 h-14 object-contain" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground text-sm">
                  დიდ ეკრანზე თამაში
                </p>
                <p className="text-xs text-muted-foreground">
                  ითამაშე მეგობრებთან ერთად TV-ზე
                </p>
              </div>
            </div>
            
            {/* CTA Button - matching account switcher dropdown style */}
            <motion.button
              onClick={onOpenTV}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-foreground transition-colors"
              style={{
                background: "linear-gradient(180deg, #FFFFFF 0%, #FEFEFE 100%)",
                boxShadow: "0 3px 0 #D8D0E8, 0 4px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,1)",
                border: "2px solid #E8E0F5",
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Tv className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">TV-სთან დაკავშირება</span>
            </motion.button>
          </div>
        </motion.div>

        {/* Weekly Challenge Widget */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2 text-primary">
            <Trophy className="w-4 h-4" />
            <span className="text-sm font-bold tracking-wide">
              კვირის გამოწვევა
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">10 თამაში ითამაშე</p>
                  <p className="text-xs text-muted-foreground">3/10 შესრულებულია</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full" style={{ width: "30%" }} />
            </div>
          </div>
        </motion.div>

        {/* Friends Online Widget */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2 text-primary">
            <Users className="w-4 h-4" />
            <span className="text-sm font-bold tracking-wide">
              მეგობრები ონლაინ
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
                    👥
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">3 მეგობარი ონლაინ</p>
                  <p className="text-xs text-muted-foreground">მოიწვიე თამაშში</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </motion.div>

        {/* Daily Bonus Widget */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-bold tracking-wide">
              დღის ბონუსი
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/5 border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-xl">
                  🎁
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">დღის საჩუქარი</p>
                  <p className="text-xs text-muted-foreground">დააჭირე მისაღებად</p>
                </div>
              </div>
              <div className="px-2 py-1 rounded-full bg-purple-500/20 text-purple-600 text-xs font-medium">
                +50 💎
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </aside>
  );
}

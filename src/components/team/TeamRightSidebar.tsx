import { useState } from "react";
import { motion } from "framer-motion";
import { Tv, Users, Trophy, ChevronRight } from "lucide-react";
import { GameInvitationsSection } from "./GameInvitationsSection";
import { ActiveRoomsWidget } from "./widgets/ActiveRoomsWidget";
import { MyTriviasWidget } from "./widgets/MyTriviasWidget";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFriends, Friend } from "@/hooks/useFriends";
import { SafeAvatar } from "@/components/shared/SafeAvatar";
import { WeeklyChallengeModal } from "@/components/challenge/WeeklyChallengeModal";
import tvIcon from "@/assets/tv-3d-icon.png";

interface TeamRightSidebarProps {
  onAcceptInvitation: (invitationId: string) => Promise<string | null>;
  onJoinRoom: (roomCode: string) => void;
  onOpenTV: () => void;
  activeTab: string;
  onViewAllRooms: () => void;
  onViewAllTrivias: () => void;
}

export function TeamRightSidebar({ 
  onAcceptInvitation, 
  onJoinRoom,
  onOpenTV,
  activeTab,
  onViewAllRooms,
  onViewAllTrivias,
}: TeamRightSidebarProps) {
  const { t } = useLanguage();
  const { friends, onlineUsers } = useFriends();
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  
  // Get online friends
  const onlineFriends = friends.filter(f => onlineUsers.has(f.friendId));

  return (
    <>
      <WeeklyChallengeModal open={showChallengeModal} onOpenChange={setShowChallengeModal} />
    <aside className="hidden xl:flex flex-col w-[320px] min-w-[320px] sticky top-0 h-screen border-l border-border/50 bg-background/50 backdrop-blur-sm">
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

        {/* Active Rooms Widget - Hidden when on Rooms tab */}
        {activeTab !== "rooms" && (
          <ActiveRoomsWidget onViewAll={onViewAllRooms} onJoinRoom={onJoinRoom} />
        )}

        {/* My Trivias Widget - Hidden when on My Trivia tab */}
        {activeTab !== "my-content" && (
          <MyTriviasWidget onViewAll={onViewAllTrivias} />
        )}

        {/* Weekly Challenge Widget */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2 text-foreground">
            <Trophy className="w-4 h-4" />
            <span className="text-sm font-bold tracking-wide">
              კვირის გამოწვევა
            </span>
          </div>

          <button 
            onClick={() => setShowChallengeModal(true)}
            className="w-full p-4 rounded-2xl bg-muted/50 border border-border/50 hover:bg-muted/70 transition-colors text-left"
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-semibold text-foreground text-sm">ითამაშე 10 თამაში</p>
                <p className="text-xs text-muted-foreground">3/10 შესრულებულია</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="w-full h-2 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: "30%" }} />
            </div>
          </button>
        </motion.div>

        {/* Friends Online Widget - TEMPORARILY HIDDEN */}
        {/* <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2 text-foreground">
            <Users className="w-4 h-4" />
            <span className="text-sm font-bold tracking-wide">
              მეგობრები ონლაინ
            </span>
          </div>

          <div className="rounded-2xl bg-muted/50 border border-border/50 overflow-hidden">
            {onlineFriends.length > 0 ? (
              <div className="divide-y divide-border/50">
                {onlineFriends.slice(0, 5).map((friend) => (
                  <div
                    key={friend.id}
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted/80 transition-colors"
                  >
                    <div className="relative">
                      <SafeAvatar
                        avatarUrl={friend.avatarUrl}
                        fallback={friend.nickname || '?'}
                        className="w-10 h-10"
                        fallbackClassName="bg-muted text-muted-foreground"
                      />
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                    </div>
                    
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{friend.nickname}</p>
                      <p className="text-xs text-green-600">ონლაინ</p>
                    </div>
                    
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                არცერთი მეგობარი არ არის ონლაინ
              </div>
            )}
          </div>
        </motion.div> */}
      </div>
    </aside>
    </>
  );
}

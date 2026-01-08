import { motion, AnimatePresence } from "framer-motion";
import { X, UserPlus, Swords, Trophy, Gamepad2, Target, Flame, Check, Clock, Heart, Play } from "lucide-react";
import iconTrophy from "@/assets/icon-trophy.png";
import iconTrivia from "@/assets/trivia-buzzer.png";
import iconCollections from "@/assets/icon-collections.png";
import iconChatBubble from "@/assets/chat-bubble.png";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { usePlayerProfile as usePlayerProfileData } from "@/hooks/usePlayerProfile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useState } from "react";
import { FriendChatSheet } from "@/components/chat/FriendChatSheet";

interface PlayerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
}

const ACHIEVEMENT_ICONS: Record<string, string> = {
  first_win: "🏆",
  streak_5: "🔥",
  streak_10: "⚡",
  games_10: "🎮",
  games_50: "🎯",
  games_100: "👑",
  perfect_game: "💎",
  social_butterfly: "🦋",
  trivia_master: "🧠",
};

export function PlayerProfileModal({ isOpen, onClose, userId }: PlayerProfileModalProps) {
  const { user } = useAuth();
  const { data, loading } = usePlayerProfileData(userId);
  const [addingFriend, setAddingFriend] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const getFlagEmoji = (countryCode: string) => {
    const codePoints = countryCode
      .toUpperCase()
      .split("")
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  const handleAddFriend = async () => {
    if (!user || !userId) return;
    
    setAddingFriend(true);
    try {
      const { error } = await supabase.from("friendships").insert({
        user_id: user.id,
        friend_id: userId,
        status: "pending",
      });

      if (error) throw error;
      toast.success("მოთხოვნა გაიგზავნა!");
    } catch (err) {
      toast.error("შეცდომა მოხდა");
    } finally {
      setAddingFriend(false);
    }
  };

  const handleChallenge = () => {
    // TODO: Implement challenge flow
    toast.info("გამოწვევის ფუნქცია მალე!");
    onClose();
  };

  const handleMessage = () => {
    setChatOpen(true);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0 border-0">
        <div className="flex flex-col h-full bg-background">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <SheetTitle className="text-lg font-semibold text-foreground">
              პროფილი
            </SheetTitle>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !data?.profile ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">პროფილი ვერ მოიძებნა</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {/* Profile Header */}
              <div className="p-6 flex flex-col items-center">
                <div className="relative">
                  <SmartAvatar
                    avatarUrl={data.profile.avatar_url}
                    animatedAvatarUrl={data.profile.animated_avatar_url}
                    fallback={data.profile.nickname}
                    size="2xl"
                    className="shadow-xl w-24 h-24"
                    showSparkle={false}
                    autoPlay={true}
                  />
                </div>

                <h3 className="mt-4 text-xl font-bold text-foreground flex items-center gap-2">
                  {data.profile.country_code && (
                    <span>{getFlagEmoji(data.profile.country_code)}</span>
                  )}
                  {data.profile.nickname}
                </h3>
                
                <div className="mt-1">
                  <span className="text-sm text-muted-foreground">
                    {data.stats.totalPoints.toLocaleString()} ქულა
                  </span>
                </div>

                {/* Stats Row */}
                <div className="flex items-center gap-4 mt-4 p-3 rounded-xl bg-card/50">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1">
                      <Gamepad2 className="w-4 h-4 text-primary" />
                      <span className="font-bold text-foreground">{data.stats.gamesPlayed}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">თამაშები</span>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      <span className="font-bold text-foreground">{data.stats.gamesWon}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">მოგებული</span>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1">
                      <Target className="w-4 h-4 text-green-500" />
                      <span className="font-bold text-foreground">{data.stats.winRate}%</span>
                    </div>
                    <span className="text-xs text-muted-foreground">მოგება</span>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1">
                      <Flame className="w-4 h-4 text-orange-500" />
                      <span className="font-bold text-foreground">{data.stats.bestStreak}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">სტრიქი</span>
                  </div>
                </div>

                {/* Action Buttons */}
                {!data.isCurrentUser && (
                  <div className="flex items-center gap-3 mt-4 w-full max-w-xs">
                    {data.friendshipStatus === 'none' && (
                      <ChunkyButton
                        onClick={handleAddFriend}
                        disabled={addingFriend}
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        დამატება
                      </ChunkyButton>
                    )}
                    {data.friendshipStatus === 'sent' && (
                      <ChunkyButton disabled variant="secondary" size="sm" className="flex-1">
                        <Clock className="w-4 h-4 mr-1" />
                        გაგზავნილია
                      </ChunkyButton>
                    )}
                    {data.friendshipStatus === 'accepted' && (
                      <>
                        <ChunkyButton disabled variant="secondary" size="sm" className="flex-1">
                          <Check className="w-4 h-4 mr-1" />
                          მეგობარი
                        </ChunkyButton>
                        <ChunkyButton onClick={handleMessage} variant="secondary" size="sm" className="w-10">
                          <img src={iconChatBubble} alt="" className="w-5 h-5" />
                        </ChunkyButton>
                      </>
                    )}
                    <ChunkyButton onClick={handleChallenge} variant="primary" size="sm" className="flex-1">
                      <Swords className="w-4 h-4 mr-1" />
                      გამოწვევა
                    </ChunkyButton>
                  </div>
                )}
              </div>

              {/* Tabs */}
              <Tabs defaultValue="trophies" className="px-4 pb-6">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="trophies" className="flex flex-col items-center gap-0.5">
                    <img src={iconTrophy} alt="" className="w-7 h-7" />
                    <span className="text-xs">ჯილდოები</span>
                  </TabsTrigger>
                  <TabsTrigger value="trivias" className="flex flex-col items-center gap-0.5">
                    <img src={iconTrivia} alt="" className="w-7 h-7" />
                    <span className="text-xs">ტრივია</span>
                  </TabsTrigger>
                  <TabsTrigger value="collections" className="flex flex-col items-center gap-0.5">
                    <img src={iconCollections} alt="" className="w-7 h-7" />
                    <span className="text-xs">კოლექციები</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="trophies">
                  {data.achievements.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Trophy className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>ჯერ არ აქვს ჯილდოები</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-3">
                      {data.achievements.map((achievement) => (
                        <motion.div
                          key={achievement.id}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="aspect-square rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/20 border border-amber-500/30 flex items-center justify-center text-2xl"
                        >
                          {ACHIEVEMENT_ICONS[achievement.achievement_id] || "🏅"}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="trivias">
                  {data.trivias.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Gamepad2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>ჯერ არ აქვს ტრივიები</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {data.trivias.map((trivia) => (
                        <motion.div
                          key={trivia.id}
                          initial={{ y: 10, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
                        >
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                            {trivia.cover_image ? (
                              <img src={trivia.cover_image} alt="" className="w-full h-full object-cover rounded-lg" />
                            ) : (
                              <Gamepad2 className="w-6 h-6 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{trivia.title}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Play className="w-3 h-3" /> {trivia.plays_count || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <Heart className="w-3 h-3" /> {trivia.likes_count || 0}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="collections">
                  {data.collections.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Target className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>ჯერ არ აქვს კოლექციები</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {data.collections.map((collection) => (
                        <motion.div
                          key={collection.id}
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="rounded-xl overflow-hidden border border-border"
                        >
                          <div 
                            className="aspect-video"
                            style={{ background: collection.cover_gradient }}
                          >
                            {collection.cover_image && (
                              <img src={collection.cover_image} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="p-2 bg-card">
                            <p className="font-medium text-sm text-foreground truncate">{collection.title}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Play className="w-3 h-3" /> {collection.plays_count || 0}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </SheetContent>

      {/* Chat Sheet */}
      <FriendChatSheet
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        friendId={userId}
        friendProfile={data?.profile ? {
          nickname: data.profile.nickname,
          avatar_url: data.profile.avatar_url,
          animated_avatar_url: data.profile.animated_avatar_url,
        } : null}
      />
    </Sheet>
  );
}

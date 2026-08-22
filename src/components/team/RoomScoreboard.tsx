import { useState } from "react";
import { motion } from "framer-motion";
import { Crown, Swords, Users, Send, X, Plus, UserPlus, Check } from "lucide-react";
import { RoomParticipant } from "@/hooks/useGameRoom";
import { MatchHistoryEntry } from "@/hooks/useRoomMatchHistory";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFriends } from "@/contexts/FriendsContext";
import { useAuth } from "@/hooks/useAuth";
import { shouldOfferFriendRequest } from "@/utils/friendOffer";
import medalGold from "@/assets/icons/medal-gold.png";
import medalSilver from "@/assets/icons/medal-silver.png";
import medalBronze from "@/assets/icons/medal-bronze.png";

interface RoomScoreboardProps {
  participants: (RoomParticipant & { total_score?: number })[];
  matches: MatchHistoryEntry[];
  currentUserId?: string;
  showHostCrown?: boolean;
  maxPlayers?: number;
  isHost?: boolean;
  isRoomActive?: boolean;
  onInviteFriends?: () => void;
  onResendInvitation?: (userId: string) => void;
  onRemoveParticipant?: (participantId: string) => void;
}

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <img src={medalGold} alt="1st" className="w-6 h-6 object-contain" />;
    case 2:
      return <img src={medalSilver} alt="2nd" className="w-6 h-6 object-contain" />;
    case 3:
      return <img src={medalBronze} alt="3rd" className="w-6 h-6 object-contain" />;
    default:
      return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
  }
};

/**
 * Add the player beside you in the lobby.
 *
 * The room is where players actually meet — seven of them on a scoreboard,
 * having just played fifteen rounds together — and there was no way to add
 * any of them from here. Adding a friend meant knowing their name and going
 * to find them.
 *
 * Hidden for yourself, for an invited placeholder who has not arrived, and
 * for someone already on the friends list. sendFriendRequest handles the
 * rest: it accepts a request they had already sent you rather than opening a
 * second one, and says so if you are already friends.
 */
function AddFriendButton({ userId }: { userId: string }) {
  const { user } = useAuth();
  const { friends, sendFriendRequest } = useFriends();
  const { t } = useLanguage();
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  if (!shouldOfferFriendRequest(user?.id, userId, friends.map((f) => f.friendId))) {
    return null;
  }

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.9 }}
      disabled={sending || sent}
      aria-label={t("extra.addFriendLabel")}
      onClick={async (e) => {
        // The row itself may open a profile; adding a friend is its own action.
        e.stopPropagation();
        setSending(true);
        const ok = await sendFriendRequest(userId);
        setSending(false);
        if (ok) setSent(true);
      }}
      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
        sent ? "bg-emerald-500/25 text-emerald-300" : "bg-white/15 text-white hover:bg-white/25"
      }`}
    >
      {sent ? <Check className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
    </motion.button>
  );
}

export function RoomScoreboard({ participants, matches, currentUserId, showHostCrown = true, maxPlayers, isHost = false, isRoomActive = true, onInviteFriends, onResendInvitation, onRemoveParticipant }: RoomScoreboardProps) {
  const { t } = useLanguage();
  // Track sent invites for showing feedback
  const [sentInvites, setSentInvites] = useState<Set<string>>(new Set());
  // Sort by total cumulative score (primary), then by total wins (secondary)
  const sortedParticipants = [...participants].sort(
    (a, b) => {
      const scoreA = (a as any).total_score || 0;
      const scoreB = (b as any).total_score || 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (b.total_wins || 0) - (a.total_wins || 0);
    }
  );

  const getFlagEmoji = (countryCode: string) => {
    try {
      const codePoints = countryCode
        .toUpperCase()
        .split("")
        .map(char => 127397 + char.charCodeAt(0));
      return String.fromCodePoint(...codePoints);
    } catch {
      return "🏳️";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden bg-white/10 border border-white/[0.12]"
    >
      {/* Header - Combined label with count */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-white/60" />
          <span className="font-semibold text-white text-[15.4px]">
            {t("extra.playersHeader")} {maxPlayers && <span className="text-white/60">({participants.length}/{maxPlayers})</span>}
          </span>
        </div>

        {isHost && onInviteFriends && (
          <motion.button
            type="button"
            onClick={onInviteFriends}
            whileTap={{ scale: 0.92 }}
            className="w-10 h-10 rounded-xl border border-dashed border-white/40 flex items-center justify-center"
            aria-label={t("extra.addFriendLabel")}
            title={t("extra.addFriendLabel")}
          >
            <Plus className="w-5 h-5 text-white/60" />
          </motion.button>
        )}
      </div>

      {/* Scoreboard Content */}
      <div className="p-3">
        {/* VS Display for 2 players */}
        {sortedParticipants.length === 2 ? (
          <div className="flex items-center justify-center gap-4 mb-4">
            {/* Player 1 */}
            {(() => {
              const player = sortedParticipants[0];
              const isInvited = (player.status as string) === 'invited';
              return (
                <div className="flex-1 flex justify-end">
                  <div className={`text-center max-w-[120px] ${isInvited ? 'opacity-60' : ''}`}>
                    <div className={`relative inline-block mb-2 ${isInvited ? 'grayscale' : ''}`}>
                      {showHostCrown && player.is_host && !isInvited && (
                        <Crown className="absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-5 text-amber-500 fill-amber-400 z-10" />
                      )}
                      <SmartAvatar
                        avatarUrl={player.avatar_url}
                        fallback={player.nickname}
                        size="xl"
                      />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-card border-2 border-border flex items-center justify-center text-sm">
                        {getFlagEmoji(player.country_code || "GE")}
                      </div>
                    </div>
                    <p className={`font-medium text-sm truncate ${isInvited ? 'text-white/50' : 'text-white'}`}>
                      {player.user_id === currentUserId ? t("extra.youLabel") : player.nickname}
                    </p>
                    {isInvited ? (
                      <div className="mt-2 flex flex-col items-center">
                        {isHost && sentInvites.has(player.user_id) ? (
                         <>
                            <span className="text-xs text-green-400 font-medium">{t("extra.sentLabel")}</span>
                            <motion.p 
                              animate={{ opacity: [0.5, 1, 0.5] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="text-xs text-white/50"
                            >
                              {t("extra.waitingLabel")}
                            </motion.p>
                          </>
                        ) : (
                          <>
                            <motion.p 
                              animate={{ opacity: [0.5, 1, 0.5] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="text-xs text-white/40 italic"
                             >
                              {t("extra.invitedEllipsis")}
                            </motion.p>
                            {isHost && (
                              <div className="min-h-[36px] flex items-center justify-center mt-1">
                                <motion.button
                                  onClick={async () => {
                                    await onResendInvitation?.(player.user_id);
                                    setSentInvites(prev => new Set([...prev, player.user_id]));
                                  }}
                                  className="px-4 py-1.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium text-xs shadow-md flex items-center gap-1.5"
                                  whileTap={{ scale: 0.95 }}
                                >
                                   <Send className="w-3 h-3" />
                                   {isRoomActive ? t("extra.resendInvite") : t("extra.sendInvite")}
                                </motion.button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center mt-2">
                        <span className="text-2xl font-display font-bold text-white">
                          {(player as any).total_score || 0}
                        </span>
                        <p className="text-xs text-white/60">
                          {t("extra.scoreboardRoundStats", { rounds: player.total_rounds_played || 0, wins: player.total_wins || 0 })}
                        </p>
                        <div className="mt-1.5">
                          <AddFriendButton userId={player.user_id} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* VS Icon - centered */}
            <div className="flex-shrink-0 flex flex-col items-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center"
                style={{ boxShadow: "0 4px 16px rgba(239,68,68,0.4)" }}
              >
                <Swords className="w-6 h-6 text-white" />
              </motion.div>
              <span className="text-xs text-white/60 mt-1">
                {t("extra.scoreboardRoundsLabel", { count: sortedParticipants[0].total_rounds_played || 0 })}
              </span>
            </div>

            {/* Player 2 */}
            {(() => {
              const player = sortedParticipants[1];
              const isInvited = (player.status as string) === 'invited';
              return (
                <div className="flex-1 flex justify-start">
                  <div className={`text-center max-w-[120px] ${isInvited ? 'opacity-60' : ''}`}>
                    <div className={`relative inline-block mb-2 ${isInvited ? 'grayscale' : ''}`}>
                      {showHostCrown && player.is_host && !isInvited && (
                        <Crown className="absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-5 text-amber-500 fill-amber-400 z-10" />
                      )}
                      <SmartAvatar
                        avatarUrl={player.avatar_url}
                        fallback={player.nickname}
                        size="xl"
                      />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-card border-2 border-border flex items-center justify-center text-sm">
                        {getFlagEmoji(player.country_code || "GE")}
                      </div>
                    </div>
                    <p className={`font-medium text-sm truncate ${isInvited ? 'text-white/50' : 'text-white'}`}>
                      {player.user_id === currentUserId ? t("extra.youLabel") : player.nickname}
                    </p>
                    {isInvited ? (
                      <div className="mt-2 flex flex-col items-center">
                        {isHost && sentInvites.has(player.user_id) ? (
                         <>
                            <span className="text-xs text-green-400 font-medium">{t("extra.sentLabel")}</span>
                            <motion.p 
                              animate={{ opacity: [0.5, 1, 0.5] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="text-xs text-white/50"
                            >
                              {t("extra.waitingLabel")}
                            </motion.p>
                          </>
                        ) : (
                          <>
                            <motion.p 
                              animate={{ opacity: [0.5, 1, 0.5] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="text-xs text-white/40 italic"
                             >
                              {t("extra.invitedEllipsis")}
                            </motion.p>
                            {isHost && (
                              <div className="min-h-[36px] flex items-center justify-center mt-1">
                                <motion.button
                                  onClick={async () => {
                                    await onResendInvitation?.(player.user_id);
                                    setSentInvites(prev => new Set([...prev, player.user_id]));
                                  }}
                                  className="px-4 py-1.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium text-xs shadow-md flex items-center gap-1.5"
                                  whileTap={{ scale: 0.95 }}
                                >
                                   <Send className="w-3 h-3" />
                                   {isRoomActive ? t("extra.resendInvite") : t("extra.sendInvite")}
                                </motion.button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center mt-2">
                        <span className="text-2xl font-display font-bold text-white">
                          {(player as any).total_score || 0}
                        </span>
                        <p className="text-xs text-white/60">
                          {t("extra.scoreboardRoundStats", { rounds: player.total_rounds_played || 0, wins: player.total_wins || 0 })}
                        </p>
                        <div className="mt-1.5">
                          <AddFriendButton userId={player.user_id} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          /* Multi-player list */
          <div className="space-y-2">
            {sortedParticipants.map((p, index) => {
              const isInvited = (p.status as string) === 'invited';
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 p-2.5 rounded-xl transition-opacity ${
                    isInvited 
                      ? "bg-white/5 opacity-50" 
                      : p.user_id === currentUserId 
                        ? "bg-white/15" 
                        : "bg-white/5"
                  }`}
                >
                  {/* Rank - fixed width */}
                  <div className="w-7 flex items-center justify-center flex-shrink-0">
                    {isInvited ? (
                      <span className="text-xs text-white/40">...</span>
                    ) : (
                      getRankIcon(index + 1)
                    )}
                  </div>
                  
                  {/* Avatar */}
                  <div className={isInvited ? "grayscale" : ""}>
                    <SmartAvatar
                      avatarUrl={p.avatar_url}
                      fallback={p.nickname}
                      size="md"
                    />
                  </div>
                  
                  {/* Name + Crown - flex grow. The add-friend button belongs
                      to the person, so it sits with their name rather than
                      out in the score column, where it read as part of the
                      score. */}
                  <div className="flex-1 min-w-0 flex items-center gap-1.5">
                    <p className={`font-medium text-sm truncate ${isInvited ? "text-white/50" : "text-white"}`}>
                      {p.user_id === currentUserId ? t("extra.youLabel") : p.nickname}
                    </p>
                    {isInvited && (
                      <span className="text-xs text-white/40 italic">{t("extra.invitedLabel")}</span>
                    )}
                    {showHostCrown && p.is_host && !isInvited && (
                      <Crown className="w-4 h-4 text-amber-400 fill-amber-400 flex-shrink-0" />
                    )}
                    {!isInvited && <AddFriendButton userId={p.user_id} />}
                  </div>

                  {/* Score + Rounds - fixed width, right aligned */}
                  {!isInvited ? (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="font-bold text-white">{(p as any).total_score || 0}</span>
                      <span className="text-xs text-white/60">
                        ({t("extra.roundsShort", { count: p.total_rounds_played || 0 })})
                      </span>
                    </div>
                  ) : isHost && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        {sentInvites.has(p.user_id) ? (
                          <div className="flex flex-col items-center">
                            <span className="text-xs text-green-400 font-medium">{t("extra.sentLabel")}</span>
                            <motion.p 
                              animate={{ opacity: [0.5, 1, 0.5] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="text-[10px] text-white/50"
                            >
                              {t("extra.waitingLabel")}
                          </motion.p>
                        </div>
                      ) : (
                        <motion.button
                          onClick={async () => {
                            await onResendInvitation?.(p.user_id);
                            setSentInvites(prev => new Set([...prev, p.user_id]));
                          }}
                          className="px-3 py-1.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium text-xs shadow-md flex items-center gap-1.5"
                          whileTap={{ scale: 0.95 }}
                        >
                           <Send className="w-3 h-3" />
                           {isRoomActive ? t("extra.resendInvite") : t("extra.sendInvite")}
                        </motion.button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Recent Rounds */}
        {matches.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-[13.2px] text-white/50 mb-2">{t("extra.recentRoundsTitle")}</p>
            <div className="space-y-1.5 max-h-28 overflow-y-auto">
              {matches.slice(0, 5).map((match, index) => {
                const winner = match.player_scores?.find(p => p.user_id === match.winner_user_id);
                const isMyWin = match.winner_user_id === currentUserId;
                const displayedCount = Math.min(matches.length, 5);
                const roundNumber = displayedCount - index;
                
                return (
                  <div
                    key={match.id}
                    className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
                      isMyWin ? "bg-green-500/20" : "bg-white/5"
                    }`}
                  >
                    <span className="text-white/50 w-6 text-center text-xs">#{roundNumber}</span>
                    <div className="w-5 flex items-center justify-center flex-shrink-0">
                      <img 
                        src={isMyWin ? medalGold : medalSilver} 
                        alt={isMyWin ? "Win" : "Loss"} 
                        className="w-5 h-5 object-contain" 
                      />
                    </div>
                    <span className="flex-1 font-medium truncate text-xs text-white/90">
                      {isMyWin 
                        ? t("extra.scoreboardYouWon")
                        : t("extra.scoreboardPlayerWon", { name: winner?.nickname || "?" })}
                    </span>
                    <span className="text-white/50 text-xs">{winner?.score || 0}pts</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

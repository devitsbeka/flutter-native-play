import { motion } from "framer-motion";
import { Crown, Swords, Target, Users } from "lucide-react";
import { RoomParticipant } from "@/hooks/useGameRoom";
import { MatchHistoryEntry } from "@/hooks/useRoomMatchHistory";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import medalGold from "@/assets/icons/medal-gold.png";
import medalSilver from "@/assets/icons/medal-silver.png";
import medalBronze from "@/assets/icons/medal-bronze.png";

interface RoomScoreboardProps {
  participants: (RoomParticipant & { total_score?: number })[];
  matches: MatchHistoryEntry[];
  currentUserId?: string;
  showHostCrown?: boolean;
  maxPlayers?: number;
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

export function RoomScoreboard({ participants, matches, currentUserId, showHostCrown = true, maxPlayers }: RoomScoreboardProps) {
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
      className="rounded-2xl overflow-hidden bg-white/10 backdrop-blur-md border border-white/20"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <span className="font-semibold text-white text-sm">მოთამაშეები</span>
        {maxPlayers && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-sm font-medium text-white/80">
            <Users className="w-3.5 h-3.5" />
            <span>{participants.length}/{maxPlayers}</span>
          </div>
        )}
      </div>

      {/* Scoreboard Content */}
      <div className="p-3">
        {/* VS Display for 2 players */}
        {sortedParticipants.length === 2 ? (
          <div className="flex items-center justify-center gap-4 mb-4">
            {/* Player 1 */}
            <div className="flex-1 text-center">
              <div className="relative inline-block mb-2">
                {showHostCrown && sortedParticipants[0].is_host && (
                  <Crown className="absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-5 text-amber-500 fill-amber-400 z-10" />
                )}
                <SmartAvatar
                  avatarUrl={sortedParticipants[0].avatar_url}
                  fallback={sortedParticipants[0].nickname}
                  size="xl"
                />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-card border-2 border-border flex items-center justify-center text-sm">
                  {getFlagEmoji(sortedParticipants[0].country_code || "GE")}
                </div>
              </div>
              <p className="font-medium text-foreground text-sm truncate max-w-[100px] mx-auto">
                {sortedParticipants[0].user_id === currentUserId ? "შენ" : sortedParticipants[0].nickname}
              </p>
              {/* Total Score with Rounds */}
              <div className="flex flex-col items-center mt-2">
                <div className="flex items-center gap-1">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="text-2xl font-display font-bold text-foreground">
                    {(sortedParticipants[0] as any).total_score || 0}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {sortedParticipants[0].total_rounds_played || 0} რაუნდი • {sortedParticipants[0].total_wins || 0} მოგ.
                </p>
              </div>
            </div>

            {/* VS */}
            <div className="flex flex-col items-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center"
                style={{ boxShadow: "0 4px 16px rgba(239,68,68,0.4)" }}
              >
                <Swords className="w-6 h-6 text-white" />
              </motion.div>
              <span className="text-xs text-muted-foreground mt-1">
                {(sortedParticipants[0].total_rounds_played || 0)} რაუნდი
              </span>
            </div>

            {/* Player 2 */}
            <div className="flex-1 text-center">
              <div className="relative inline-block mb-2">
                {showHostCrown && sortedParticipants[1].is_host && (
                  <Crown className="absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-5 text-amber-500 fill-amber-400 z-10" />
                )}
                <SmartAvatar
                  avatarUrl={sortedParticipants[1].avatar_url}
                  fallback={sortedParticipants[1].nickname}
                  size="xl"
                />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-card border-2 border-border flex items-center justify-center text-sm">
                  {getFlagEmoji(sortedParticipants[1].country_code || "GE")}
                </div>
              </div>
              <p className="font-medium text-foreground text-sm truncate max-w-[100px] mx-auto">
                {sortedParticipants[1].user_id === currentUserId ? "შენ" : sortedParticipants[1].nickname}
              </p>
              {/* Total Score with Rounds */}
              <div className="flex flex-col items-center mt-2">
                <div className="flex items-center gap-1">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="text-2xl font-display font-bold text-foreground">
                    {(sortedParticipants[1] as any).total_score || 0}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {sortedParticipants[1].total_rounds_played || 0} რაუნდი • {sortedParticipants[1].total_wins || 0} მოგ.
                </p>
              </div>
            </div>
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
                  
                  {/* Name + Crown - flex grow */}
                  <div className="flex-1 min-w-0 flex items-center gap-1.5">
                    <p className={`font-medium text-sm truncate ${isInvited ? "text-white/50" : "text-white"}`}>
                      {p.user_id === currentUserId ? "შენ" : p.nickname}
                    </p>
                    {isInvited && (
                      <span className="text-xs text-white/40 italic">მოწვეული</span>
                    )}
                    {showHostCrown && p.is_host && !isInvited && (
                      <Crown className="w-4 h-4 text-amber-400 fill-amber-400 flex-shrink-0" />
                    )}
                  </div>
                  
                  {/* Score + Rounds - fixed width, right aligned */}
                  {!isInvited && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="font-bold text-white">{(p as any).total_score || 0}</span>
                      <span className="text-xs text-white/60">
                        ({p.total_rounds_played || 0}რ)
                      </span>
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
            <p className="text-xs text-white/50 mb-2">ბოლო რაუნდები</p>
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
                        ? "შენ მოიგე" 
                        : `${winner?.nickname || "?"}-მ მოიგო`}
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

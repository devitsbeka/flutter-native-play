import { motion } from "framer-motion";
import { Trophy, Crown, Swords, Target } from "lucide-react";
import { RoomParticipant } from "@/hooks/useGameRoom";
import { MatchHistoryEntry } from "@/hooks/useRoomMatchHistory";
import { SmartAvatar } from "@/components/shared/SmartAvatar";

interface RoomScoreboardProps {
  participants: (RoomParticipant & { total_score?: number })[];
  matches: MatchHistoryEntry[];
  currentUserId?: string;
  showHostCrown?: boolean;
}

export function RoomScoreboard({ participants, matches, currentUserId, showHostCrown = true }: RoomScoreboardProps) {
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
      className="rounded-3xl overflow-hidden bg-card border border-border shadow-lg"
    >
      {/* Header */}
      <div className="flex items-center justify-center gap-2 py-3 bg-primary/10 border-b border-border">
        <Trophy className="w-5 h-5 text-primary" />
        <span className="font-display font-bold text-foreground">ქულების ცხრილი</span>
        <Trophy className="w-5 h-5 text-primary" />
      </div>

      {/* Scoreboard Content */}
      <div className="p-4">
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
          <div className="space-y-2 mb-4">
            {sortedParticipants.map((p, index) => (
              <div
                key={p.id}
                className={`flex items-center gap-3 p-2 rounded-xl ${
                  p.user_id === currentUserId ? "bg-primary/10" : "bg-muted/30"
                }`}
              >
                <span className="w-6 text-center font-bold text-muted-foreground">
                  #{index + 1}
                </span>
                <SmartAvatar
                  avatarUrl={p.avatar_url}
                  fallback={p.nickname}
                  size="sm"
                />
                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                  <p className="font-medium text-foreground text-sm truncate">
                    {p.user_id === currentUserId ? "შენ" : p.nickname}
                  </p>
                  {showHostCrown && p.is_host && (
                    <Crown className="w-4 h-4 text-amber-500 fill-amber-400 flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-primary" />
                    <span className="font-bold text-foreground text-sm">{(p as any).total_score || 0}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    ({p.total_rounds_played || 0}რ)
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recent Rounds */}
        {matches.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/30">
            <p className="text-xs text-muted-foreground mb-2 text-center">ბოლო რაუნდები</p>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {matches.slice(0, 5).map((match, index) => {
                const winner = match.player_scores?.find(p => p.user_id === match.winner_user_id);
                const isMyWin = match.winner_user_id === currentUserId;
                
                return (
                  <div
                    key={match.id}
                    className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
                      isMyWin ? "bg-green-500/10" : "bg-muted/30"
                    }`}
                  >
                    <span className="text-muted-foreground">#{matches.length - index}</span>
                    <span className="text-base">{isMyWin ? "🏆" : index === 0 ? "🥈" : "🎮"}</span>
                    <span className="flex-1 font-medium truncate">
                      {winner?.user_id === currentUserId 
                        ? "შენ მოიგე" 
                        : `${winner?.nickname || "?"}-მ მოიგო`}
                    </span>
                    <span className="text-muted-foreground">{winner?.score || 0}pts</span>
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

import { motion } from "framer-motion";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useGame } from "@/contexts/GameContext";
import { useAuth } from "@/hooks/useAuth";
import { User, Users, Trophy, LogIn, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getRankFromPoints } from "@/data/opponents";

export function HomeScreen() {
  const { startMatchmaking } = useGame();
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSolo = () => {
    startMatchmaking();
  };

  const handleTeam = () => {
    navigate("/team");
  };

  const handleLeaderboards = () => {
    navigate("/leaderboards");
  };

  const rank = profile ? getRankFromPoints(profile.total_points) : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      {/* User Card - Top Right */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-6 right-6"
      >
        {user && profile ? (
          <div className="flex items-center gap-3 glass rounded-full pl-5 pr-2 py-2">
            <div className="text-right">
              <p className="font-semibold text-foreground text-sm">{profile.nickname}</p>
              <p className="text-xs text-muted-foreground">
                {rank?.name} · {profile.total_points.toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => signOut()}
              className="p-2.5 rounded-full bg-secondary hover:bg-muted transition-colors"
            >
              <LogOut className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <ChunkyButton
            variant="ghost"
            size="sm"
            onClick={() => navigate("/auth")}
            icon={<LogIn className="w-4 h-4" />}
          >
            Sign In
          </ChunkyButton>
        )}
      </motion.div>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
        className="mb-16 text-center"
      >
        <h1 className="text-5xl md:text-6xl font-bold text-foreground tracking-tight">
          Quiz Battle
        </h1>
        <p className="text-muted-foreground mt-3 text-lg">
          Challenge your knowledge
        </p>
      </motion.div>

      {/* Main Menu Buttons */}
      <motion.div
        className="flex flex-col gap-4 w-full max-w-xs"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <ChunkyButton
            variant="primary"
            size="xl"
            className="w-full"
            onClick={handleSolo}
            icon={<User className="w-5 h-5" />}
          >
            Play Solo
          </ChunkyButton>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <ChunkyButton
            variant="secondary"
            size="xl"
            className="w-full"
            onClick={handleTeam}
            icon={<Users className="w-5 h-5" />}
          >
            Team Mode
          </ChunkyButton>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <ChunkyButton
            variant="ghost"
            size="xl"
            className="w-full"
            onClick={handleLeaderboards}
            icon={<Trophy className="w-5 h-5" />}
          >
            Leaderboards
          </ChunkyButton>
        </motion.div>
      </motion.div>

      {/* Stats */}
      {profile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 flex items-center gap-8"
        >
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{profile.games_played}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Games</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{profile.games_won}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Wins</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{profile.best_streak}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Streak</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

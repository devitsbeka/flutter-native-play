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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-background via-background to-primary/10">
      {/* Header with user info */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-4 right-4"
      >
        {user && profile ? (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="font-semibold text-foreground">{profile.nickname}</p>
              <p className={`text-sm ${rank?.color}`}>
                {rank?.name} • {profile.total_points.toLocaleString()} pts
              </p>
            </div>
            <button
              onClick={() => signOut()}
              className="p-2 rounded-full bg-card hover:bg-muted transition-colors"
            >
              <LogOut className="w-5 h-5" />
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
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
        className="mb-12 text-center"
      >
        <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-primary to-chart-2 bg-clip-text text-transparent">
          Quiz Battle
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Challenge your knowledge!
        </p>
      </motion.div>

      {/* Main Menu Buttons */}
      <motion.div
        className="flex flex-col gap-5 w-full max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <ChunkyButton
            variant="primary"
            size="xl"
            className="w-full"
            onClick={handleSolo}
            icon={<User className="w-7 h-7" />}
          >
            Solo
          </ChunkyButton>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <ChunkyButton
            variant="secondary"
            size="xl"
            className="w-full"
            onClick={handleTeam}
            icon={<Users className="w-7 h-7" />}
          >
            Team
          </ChunkyButton>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <ChunkyButton
            variant="ghost"
            size="xl"
            className="w-full"
            onClick={handleLeaderboards}
            icon={<Trophy className="w-7 h-7" />}
          >
            Leaderboards
          </ChunkyButton>
        </motion.div>
      </motion.div>

      {/* Stats for logged in users */}
      {profile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 grid grid-cols-3 gap-4 text-center"
        >
          <div className="bg-card/50 rounded-xl p-3">
            <p className="text-2xl font-bold text-foreground">{profile.games_played}</p>
            <p className="text-xs text-muted-foreground">Games</p>
          </div>
          <div className="bg-card/50 rounded-xl p-3">
            <p className="text-2xl font-bold text-foreground">{profile.games_won}</p>
            <p className="text-xs text-muted-foreground">Wins</p>
          </div>
          <div className="bg-card/50 rounded-xl p-3">
            <p className="text-2xl font-bold text-foreground">{profile.best_streak}</p>
            <p className="text-xs text-muted-foreground">Best Streak</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

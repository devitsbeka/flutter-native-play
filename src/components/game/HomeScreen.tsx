import { motion } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { getRankFromPoints } from "@/data/opponents";
import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar } from "@/components/shared/Avatar";
import { QuizCard } from "@/components/shared/QuizCard";
import { Users, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function HomeScreen() {
  const { startMatchmaking } = useGame();
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const rank = profile ? getRankFromPoints(profile.total_points) : null;

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const headerContent = (
    <div className="pt-12 pb-20 px-6">
      {/* Top Row */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <p className="text-primary-foreground/70 text-sm font-medium mb-1">
            {getGreeting()} ☀️
          </p>
          <h1 className="text-2xl font-bold text-primary-foreground">
            {profile?.nickname || "Quiz Master"}
          </h1>
        </div>
        {user ? (
          <button onClick={() => navigate("/profile")}>
            <Avatar
              imageUrl={profile?.avatar_url || undefined}
              emoji="😎"
              countryCode={profile?.country_code || "US"}
              size="md"
              showRing
              ringColor="ring-primary-foreground/30"
            />
          </button>
        ) : (
          <button
            onClick={() => navigate("/auth")}
            className="px-4 py-2 bg-primary-foreground/10 text-primary-foreground rounded-full text-sm font-semibold"
          >
            Sign In
          </button>
        )}
      </div>

      {/* Recent Quiz Card */}
      {profile && profile.games_played > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-quiz-pink rounded-2xl p-4 mb-4"
        >
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-semibold text-foreground/70 uppercase">
              Recent Quiz
            </span>
            <span className="text-lg font-bold text-foreground">
              {profile.games_won > 0 ? Math.round((profile.games_won / profile.games_played) * 100) : 0}%
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎯</span>
            <div className="flex-1">
              <p className="font-bold text-foreground">Trivia Challenge</p>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4].map((dot) => (
                  <div
                    key={dot}
                    className={cn(
                      "w-2 h-2 rounded-full",
                      dot <= 3 ? "bg-foreground" : "bg-foreground/30"
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Featured Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-primary-foreground/10 backdrop-blur rounded-2xl p-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary-foreground/20 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-primary-foreground">Challenge Friends!</p>
            <p className="text-sm text-primary-foreground/70">
              Invite friends to compete
            </p>
          </div>
          <button className="px-4 py-2 bg-primary-foreground text-primary rounded-full text-sm font-semibold">
            Find
          </button>
        </div>
      </motion.div>
    </div>
  );

  return (
    <AppLayout 
      headerContent={headerContent} 
      headerClassName="pb-8"
    >
      <div className="px-6 pt-6">
        {/* Stats Row */}
        {profile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-3 gap-3 mb-8"
          >
            <div className="bg-secondary rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{profile.games_played}</p>
              <p className="text-xs text-muted-foreground uppercase">Games</p>
            </div>
            <div className="bg-secondary rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{profile.games_won}</p>
              <p className="text-xs text-muted-foreground uppercase">Wins</p>
            </div>
            <div className="bg-secondary rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{profile.best_streak}</p>
              <p className="text-xs text-muted-foreground uppercase">Streak</p>
            </div>
          </motion.div>
        )}

        {/* Live Quizzes */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-foreground">Live Quizzes</h2>
          <button 
            onClick={() => navigate("/discover")}
            className="text-primary text-sm font-medium flex items-center"
          >
            See all <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <QuizCard
            icon="📊"
            title="Statistics Quiz"
            subtitle="Math · 12 Quizzes"
            onClick={startMatchmaking}
          />
          <QuizCard
            icon="🌍"
            title="World Geography"
            subtitle="Geography · 8 Quizzes"
            onClick={startMatchmaking}
          />
          <QuizCard
            icon="🧬"
            title="Science Trivia"
            subtitle="Science · 15 Quizzes"
            onClick={startMatchmaking}
          />
        </motion.div>
      </div>
    </AppLayout>
  );
}

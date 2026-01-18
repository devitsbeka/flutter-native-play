import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useWorldProgress } from "@/hooks/useWorldProgress";
import { continents, Continent } from "@/data/worldData";
import { ContinentCard } from "@/components/shared/ContinentCard";
import { AnimatedGlobe } from "@/components/shared/AnimatedGlobe";
import { MainLayout } from "@/components/layout/MainLayout";

const continentEmojis: Record<string, string> = {
  asia: "🌏",
  europe: "🌍",
  north_america: "🌎",
  south_america: "🌎",
  africa: "🌍",
  oceania: "🌏",
};

export default function WorldHome() {
  const navigate = useNavigate();
  const { 
    getUnlockedContinents, 
    getContinentProgress, 
    loading 
  } = useWorldProgress();

  const unlockedContinents = getUnlockedContinents();
  const continentProgress = getContinentProgress();

  const handleContinentClick = (continent: Continent) => {
    navigate(`/continent/${continent.id}`);
  };

  const isUnlocked = (continentId: string) => {
    return unlockedContinents.includes(continentId);
  };

  const getProgress = (continentId: string) => {
    return continentProgress[continentId] || { completed: 0, total: 0 };
  };

  return (
    <MainLayout showPlayButton={false}>
    <div className="min-h-screen flex flex-col">
      {/* Teal Header */}
      <div className="gradient-teal px-6 pt-12 pb-24 relative overflow-hidden">
        {/* Decorative Globe Background */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10">
          <AnimatedGlobe className="w-80 h-80 text-trivia-teal-foreground" />
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10"
        >
          <p className="text-trivia-teal-foreground/80 text-sm mb-1">Welcome back!</p>
          <h1 className="text-2xl font-bold text-trivia-teal-foreground">
            MyTrivia
          </h1>
        </motion.div>
      </div>

      {/* Content Area */}
      <div className="flex-1 content-area -mt-12 rounded-t-3xl relative z-10 px-4 py-6 pb-24 max-w-[700px] md:max-w-[600px] mx-auto w-full">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Choose a Continent
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-4xl mb-2 animate-pulse">🌍</div>
              <p className="text-muted-foreground text-sm">Loading...</p>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-3"
          >
            {continents.map((continent, index) => {
              const progress = getProgress(continent.id);
              return (
                <motion.div
                  key={continent.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                >
                  <ContinentCard
                    name={continent.name}
                    emoji={continentEmojis[continent.id] || "🌍"}
                    countriesCompleted={progress.completed}
                    totalCountries={continent.countries.length}
                    isUnlocked={isUnlocked(continent.id)}
                    onClick={() => handleContinentClick(continent)}
                  />
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

    </div>
    </MainLayout>
  );
}

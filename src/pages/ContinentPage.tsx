import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Lock, Check } from "lucide-react";
import { getContinentById, type Country } from "@/data/worldData";
import { useWorldProgress } from "@/hooks/useWorldProgress";
import { cn } from "@/lib/utils";

export default function ContinentPage() {
  const { continentId } = useParams<{ continentId: string }>();
  const navigate = useNavigate();
  const { getCountryProgress, isCountryUnlocked, loading } = useWorldProgress();

  const continent = getContinentById(continentId || "");

  if (!continent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Continent not found</p>
      </div>
    );
  }

  const countryProgress = getCountryProgress(continentId || "");

  const getCountryCompletionPercent = (countryCode: string): number => {
    const progress = countryProgress.find(p => p.country_code === countryCode);
    if (!progress) return 0;
    return Math.round((progress.categories_completed / progress.total_categories) * 100);
  };

  const handleCountryClick = (country: Country) => {
    if (isCountryUnlocked(country.code)) {
      navigate(`/country/${country.code}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-purple px-6 pt-12 pb-8">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-full bg-primary-foreground/10"
          >
            <ArrowLeft className="w-5 h-5 text-primary-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-primary-foreground flex items-center gap-2">
              {continent.emoji} {continent.name}
            </h1>
            <p className="text-primary-foreground/70 text-sm">
              {continent.countries.length} countries to explore
            </p>
          </div>
        </div>
      </div>

      {/* Countries Grid */}
      <div className="px-6 py-6">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading countries...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {continent.countries.map((country, index) => {
              const unlocked = isCountryUnlocked(country.code);
              const completionPercent = getCountryCompletionPercent(country.code);
              const isCompleted = completionPercent === 100;

              return (
                <motion.button
                  key={country.code}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleCountryClick(country)}
                  disabled={!unlocked}
                  className={cn(
                    "w-full p-4 rounded-2xl border-2 text-left transition-all",
                    unlocked
                      ? "bg-card border-border hover:border-primary hover:shadow-lg"
                      : "bg-muted/50 border-border/50 opacity-60 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-center gap-4">
                    {/* Flag */}
                    <div className="text-4xl">{country.emoji}</div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-foreground">
                          {country.name}
                        </h3>
                        {isCompleted && (
                          <span className="text-success">
                            <Check className="w-4 h-4" />
                          </span>
                        )}
                      </div>

                      {unlocked ? (
                        <>
                          <p className="text-sm text-muted-foreground">
                            {country.categories.length} categories
                          </p>
                          {/* Progress bar */}
                          <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${completionPercent}%` }}
                              transition={{ delay: index * 0.05 + 0.3, duration: 0.5 }}
                              className="h-full bg-primary rounded-full"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {completionPercent}% complete
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Complete {country.unlockRequirement} countr{country.unlockRequirement === 1 ? "y" : "ies"} to unlock
                        </p>
                      )}
                    </div>

                    {/* Arrow/Lock */}
                    <div className="text-muted-foreground">
                      {unlocked ? (
                        <span className="text-2xl">→</span>
                      ) : (
                        <Lock className="w-5 h-5" />
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

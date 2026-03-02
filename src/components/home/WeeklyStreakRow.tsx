import { motion } from "framer-motion";
import { Plus, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface DayData {
  label: string;
  isCompleted: boolean;
  isToday: boolean;
  isFuture: boolean;
  rank: number | null; // null if no game played that day
}

const DAY_LABELS_EN = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_LABELS_KA = ["ორ", "სა", "ოთ", "ხუ", "პა", "შა", "კვ"];

function getWeekDays(): Date[] {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function formatRank(rank: number): string {
  if (rank === 1) return "1st";
  if (rank === 2) return "2nd";
  if (rank === 3) return "3rd";
  return `${rank}th`;
}

export function WeeklyStreakRow({ onNewClick }: { onNewClick?: () => void }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const dayLabels = language === "ka" ? DAY_LABELS_KA : DAY_LABELS_EN;

  // Fetch this week's game plays to determine which days user played
  const { data: weekDays = [] } = useQuery({
    queryKey: ["weekly-streak-days", user?.id],
    queryFn: async (): Promise<DayData[]> => {
      if (!user) return [];

      const days = getWeekDays();
      const weekStart = days[0].toISOString();
      const weekEnd = new Date(days[6]);
      weekEnd.setHours(23, 59, 59, 999);

      // Get all game plays this week
      const { data: plays } = await supabase
        .from("game_plays")
        .select("played_at, score")
        .eq("user_id", user.id)
        .gte("played_at", weekStart)
        .lte("played_at", weekEnd.toISOString())
        .order("played_at", { ascending: true });

      // Get user's current league rank
      const { data: leagueData } = await supabase
        .from("user_league_data")
        .select("current_rank")
        .eq("user_id", user.id)
        .single();

      const currentRank = leagueData?.current_rank || null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return days.map((day, i) => {
        const dayStart = new Date(day);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);

        const isToday = dayStart.getTime() === today.getTime();
        const isFuture = dayStart.getTime() > today.getTime();

        // Check if user played on this day
        const dayPlays = plays?.filter((p) => {
          const playDate = new Date(p.played_at);
          return playDate >= dayStart && playDate <= dayEnd;
        }) || [];

        const isCompleted = dayPlays.length > 0;

        return {
          label: dayLabels[i],
          isCompleted,
          isToday,
          isFuture,
          rank: isCompleted ? currentRank : null, // Use current rank for completed days
        };
      });
    },
    enabled: !!user,
    staleTime: 60000,
  });

  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full px-4 pt-2 pb-1 pointer-events-auto z-30 relative"
    >
      <div
        className="rounded-2xl px-4 py-3"
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        }}
      >
        {/* Top row: Friends dropdown + NEW button */}
        <div className="flex items-center justify-between mb-3">
          <button className="flex items-center gap-1 text-base font-bold text-gray-800">
            {language === "ka" ? "მეგობრები" : "Friends"}
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>
          <motion.button
            onClick={onNewClick}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold text-gray-700"
            style={{
              background: "rgba(0,0,0,0.06)",
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Plus className="w-4 h-4" />
            NEW
          </motion.button>
        </div>

        {/* Day circles row */}
        <div className="flex justify-between items-center gap-1">
          {weekDays.map((day, i) => (
            <motion.div
              key={i}
              className="flex flex-col items-center gap-1.5 flex-1"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.04, type: "spring", stiffness: 300 }}
            >
              {/* Day label */}
              <span className="text-[11px] font-semibold text-gray-400 uppercase">
                {day.label}
              </span>

              {/* Circle */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center relative"
                style={
                  day.isCompleted
                    ? {
                        background:
                          "linear-gradient(180deg, #FEF3C7 0%, #FDE68A 100%)",
                        boxShadow: "0 2px 6px rgba(253, 230, 138, 0.5)",
                      }
                    : day.isToday
                    ? {
                        background: "rgba(0,0,0,0.04)",
                        border: "2px dashed rgba(0,0,0,0.15)",
                      }
                    : {
                        background: "rgba(0,0,0,0.04)",
                      }
                }
              >
                {day.isCompleted && day.rank ? (
                  <span
                    className="text-[11px] font-black"
                    style={{
                      color: "#92400E",
                      textShadow: "0 1px 0 rgba(255,255,255,0.4)",
                    }}
                  >
                    {formatRank(day.rank)}
                  </span>
                ) : day.isToday ? (
                  <span className="text-base font-bold text-gray-400">?</span>
                ) : null}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

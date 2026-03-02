import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface DayData {
  label: string;
  isCompleted: boolean;
  isToday: boolean;
  isFuture: boolean;
  rank: number | null;
}

const DAY_LABELS_EN = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_LABELS_KA = ["ორ", "სა", "ოთ", "ხუ", "პა", "შა", "კვ"];

function getWeekDays(): Date[] {
  const now = new Date();
  const dayOfWeek = now.getDay();
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

  const { data: weekDays = [] } = useQuery({
    queryKey: ["weekly-streak-days", user?.id],
    queryFn: async (): Promise<DayData[]> => {
      if (!user) return [];

      const days = getWeekDays();
      const weekStart = days[0].toISOString();
      const weekEnd = new Date(days[6]);
      weekEnd.setHours(23, 59, 59, 999);

      const { data: plays } = await supabase
        .from("game_plays")
        .select("played_at, score")
        .eq("user_id", user.id)
        .gte("played_at", weekStart)
        .lte("played_at", weekEnd.toISOString())
        .order("played_at", { ascending: true });

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
          rank: isCompleted ? currentRank : null,
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
      {/* Top row: "Your streak" label + NEW button */}
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-base font-bold text-foreground">
          {language === "ka" ? "შენი სტრიქი" : "Your streak"}
        </span>
        <motion.button
          onClick={onNewClick}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold text-white"
          style={{
            background: "linear-gradient(180deg, #9C6ADE 0%, #7B4BBF 100%)",
            boxShadow: "0 4px 0 #5B2FA0, 0 6px 12px rgba(124, 58, 237, 0.3)",
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95, y: 2 }}
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
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">
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
                      background: "hsl(var(--background))",
                      border: "2px dashed hsl(var(--muted-foreground) / 0.3)",
                    }
                  : {
                      background: "hsl(var(--background))",
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
                <span className="text-base font-bold text-muted-foreground">?</span>
              ) : null}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
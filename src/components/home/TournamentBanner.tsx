import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Trophy } from "lucide-react";

interface TournamentBannerProps {
  className?: string;
}

export function TournamentBanner({ className = "" }: TournamentBannerProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Countdown: calculate time until end of current day (midnight)
  const getSecondsUntilMidnight = useCallback(() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
  }, []);

  const [secondsLeft, setSecondsLeft] = useState(getSecondsUntilMidnight);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft(getSecondsUntilMidnight());
    }, 1000);
    return () => clearInterval(timer);
  }, [getSecondsUntilMidnight]);

  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;
  const timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`mx-4 mt-2 rounded-2xl overflow-hidden ${className}`}
      style={{
        background: "rgba(255,255,255,0.92)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left: Trophy + Countdown */}
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
              boxShadow: "0 3px 10px rgba(255,165,0,0.35)",
            }}
          >
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider leading-tight">
              {t("tournament") || "Tournament"}
            </span>
            <span
              className="text-xl font-extrabold tracking-tight tabular-nums"
              style={{ color: "#1a1a2e" }}
            >
              {timeStr}
            </span>
          </div>
        </div>

        {/* Right: Play with Friends button */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/team", { state: { openCreateRoom: true } })}
          className="px-5 py-2.5 rounded-xl font-bold text-white text-sm"
          style={{
            background: "linear-gradient(135deg, #34D399 0%, #10B981 50%, #059669 100%)",
            boxShadow: "0 4px 14px rgba(16,185,129,0.4), 0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          {t("play_with_friends") || "ეთამაშე მეგობრებს"}
        </motion.button>
      </div>
    </motion.div>
  );
}

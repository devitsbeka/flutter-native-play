import { motion } from "framer-motion";
import { formatCompactNumber } from "@/lib/utils";
import coinIcon from "@/assets/icons/icon-coin.png";
import gemIcon from "@/assets/icons/icon-gem.png";
import type { Profile } from "@/contexts/AuthContext";

interface UserInfoBarProps {
  profile: Profile | null;
  coins: number;
  gems: number;
  onNameClick?: () => void;
  onCurrencyClick?: () => void;
  className?: string;
}

const getFlagEmoji = (countryCode: string): string => {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

export function UserInfoBar({
  profile,
  coins,
  gems,
  onNameClick,
  onCurrencyClick,
  className = "",
}: UserInfoBarProps) {
  if (!profile) return null;

  const flag = profile.country_code ? getFlagEmoji(profile.country_code) : "🌍";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
      className={`flex items-center justify-center gap-3 mx-4 mt-3 ${className}`}
    >
      {/* Flag + Name */}
      <motion.button
        onClick={onNameClick}
        whileTap={{ scale: 0.96 }}
        className="flex items-center gap-2 px-4 py-2 rounded-full"
        style={{
          background: "rgba(255,255,255,0.9)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <span className="text-lg">{flag}</span>
        <span className="font-bold text-gray-800 text-sm">{profile.nickname}</span>
      </motion.button>

      {/* Coins */}
      <motion.button
        onClick={onCurrencyClick}
        whileTap={{ scale: 0.96 }}
        className="flex items-center gap-1.5 px-3 py-2 rounded-full"
        style={{
          background: "rgba(255,255,255,0.9)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <img src={coinIcon} alt="Coins" className="w-5 h-5" />
        <span className="font-bold text-gray-800 text-sm">{formatCompactNumber(coins)}</span>
      </motion.button>

      {/* Gems */}
      <motion.button
        onClick={onCurrencyClick}
        whileTap={{ scale: 0.96 }}
        className="flex items-center gap-1.5 px-3 py-2 rounded-full"
        style={{
          background: "rgba(255,255,255,0.9)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <img src={gemIcon} alt="Gems" className="w-5 h-5" />
        <span className="font-bold text-gray-800 text-sm">{formatCompactNumber(gems)}</span>
      </motion.button>
    </motion.div>
  );
}

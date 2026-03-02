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
      className={`flex items-center justify-center mx-4 mt-3 ${className}`}
      style={{ gap: 8 }}
    >
      {/* Flag + Name */}
      <motion.button
        onClick={onNameClick}
        whileTap={{ scale: 0.96 }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <span style={{ fontSize: 44, lineHeight: 1 }}>{flag}</span>
        <span
          style={{
            color: "#1F2937",
            fontSize: 32,
            fontFamily: "'Slackey', cursive",
            fontWeight: 400,
            textTransform: "capitalize",
            lineHeight: "48px",
          }}
        >
          {profile.nickname}
        </span>
      </motion.button>

      {/* Spacer */}
      <div style={{ width: 8 }} />

      {/* Coins */}
      <motion.button
        onClick={onCurrencyClick}
        whileTap={{ scale: 0.96 }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <img src={coinIcon} alt="Coins" style={{ width: 35, height: 35 }} />
        <span
          style={{
            color: "#374151",
            fontSize: 18,
            fontFamily: "'Nunito', sans-serif",
            fontWeight: 700,
            lineHeight: "28px",
          }}
        >
          {formatCompactNumber(coins)}
        </span>
      </motion.button>

      {/* Gems */}
      <motion.button
        onClick={onCurrencyClick}
        whileTap={{ scale: 0.96 }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <img src={gemIcon} alt="Gems" style={{ width: 35, height: 35 }} />
        <span
          style={{
            color: "#374151",
            fontSize: 18,
            fontFamily: "'Nunito', sans-serif",
            fontWeight: 700,
            lineHeight: "28px",
          }}
        >
          {formatCompactNumber(gems)}
        </span>
      </motion.button>
    </motion.div>
  );
}

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import confetti from "canvas-confetti";
import xpSparkIcon from "@/assets/level/xp-spark.png";
import coinIcon from "@/assets/icons/icon-coin.png";
import gemIcon from "@/assets/icons/icon-gem.png";
import power5050 from "@/assets/powers/5050.png";
import powerFreeze from "@/assets/powers/freeze.png";
import powerReplace from "@/assets/powers/replace.png";
import powerTimeDrain from "@/assets/powers/time-drain.png";
import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const POWER_UP_ICONS: Record<string, string> = {
  "5050": power5050,
  freeze: powerFreeze,
  replace: powerReplace,
  "time-drain": powerTimeDrain,
};

interface RewardAmounts {
  coins?: number;
  gems?: number;
  xp?: number;
  powerUp?: string | null;
  powerUpCount?: number;
}

/**
 * The reward line of a toast, as icon chips rather than a sentence.
 *
 * "ჯილდო: 80 მონეტები · 35 XP" is accurate and reads like a receipt. The
 * app has an icon for every one of these — the coin, the gem, the XP spark,
 * the power-up art — and everywhere else rewards are shown as icon chips, so
 * the toasts now match. Exported for the plain sonner toasts in useMissions,
 * which cannot hold JSX of their own in a .ts file.
 */
export function RewardChipsRow({ coins = 0, gems = 0, xp = 0, powerUp, powerUpCount = 0 }: RewardAmounts) {
  const chip = "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold";
  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-1">
      {coins > 0 && (
        <span className={`${chip} bg-amber-100 text-amber-700`}>
          <img src={coinIcon} alt="" className="w-4 h-4 object-contain" />
          +{coins}
        </span>
      )}
      {xp > 0 && (
        <span className={`${chip} bg-violet-100 text-violet-700`}>
          <img src={xpSparkIcon} alt="" className="w-4 h-4 object-contain" />
          +{xp} XP
        </span>
      )}
      {gems > 0 && (
        <span className={`${chip} bg-purple-100 text-purple-700`}>
          <img src={gemIcon} alt="" className="w-4 h-4 object-contain" />
          +{gems}
        </span>
      )}
      {powerUp && powerUpCount > 0 && POWER_UP_ICONS[powerUp] && (
        <span className={`${chip} bg-emerald-100 text-emerald-700`}>
          <img src={POWER_UP_ICONS[powerUp]} alt="" className="w-4 h-4 object-contain" />
          +{powerUpCount}
        </span>
      )}
    </div>
  );
}

interface MissionCompleteToastProps {
  missionTitle: string;
  coins: number;
  gems: number;
  xp: number;
  powerUp?: string | null;
  powerUpCount?: number;
}

function getPowerUpNames(t: (key: string) => string): Record<string, string> {
  return {
    "5050": "50/50",
    "freeze": t("extra.powerUpTimeFreeze"),
    "replace": t("extra.powerUpQuestionReplace"),
    "time-drain": t("extra.powerUpTimeDrainLabel"),
  };
}

export function MissionCompleteToast({
  missionTitle,
  coins,
  gems,
  xp,
  powerUp,
  powerUpCount,
}: MissionCompleteToastProps) {
  const { t } = useLanguage();
  const POWER_UP_NAMES = getPowerUpNames(t);

  useEffect(() => {
    const duration = 1500;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.8 },
        colors: ["#8B5CF6", "#A855F7", "#C084FC", "#FFD700", "#10B981"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.8 },
        colors: ["#8B5CF6", "#A855F7", "#C084FC", "#FFD700", "#10B981"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="flex flex-col gap-2"
    >
      <div className="flex items-center gap-2">
        <motion.div
          animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 0.5, repeat: 2 }}
        >
          <Sparkles className="w-5 h-5 text-amber-400" />
        </motion.div>
        <span className="font-bold text-base">{t("extra.missionCompleted")}</span>
      </div>

      <p className="text-sm text-muted-foreground">{missionTitle}</p>

      <div className="flex flex-wrap items-center gap-3 mt-1">
        {xp > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring" }}
            className="flex items-center gap-1 bg-violet-100 text-violet-700 px-2 py-1 rounded-full text-xs font-bold"
          >
            <img src={xpSparkIcon} alt="" className="w-4 h-4" />
            +{xp} XP
          </motion.div>
        )}
        {coins > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-bold"
          >
            <img src={coinIcon} alt="" className="w-4 h-4 object-contain" />
            +{coins}
          </motion.div>
        )}
        {gems > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-bold"
          >
            <img src={gemIcon} alt="" className="w-4 h-4 object-contain" />
            +{gems}
          </motion.div>
        )}
        {powerUp && powerUpCount && powerUpCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: "spring" }}
            className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-bold"
          >
            {POWER_UP_ICONS[powerUp] && (
              <img src={POWER_UP_ICONS[powerUp]} alt="" className="w-4 h-4 object-contain" />
            )}
            +{powerUpCount} {POWER_UP_NAMES[powerUp] || powerUp}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// Helper function to show mission complete toast
export function showMissionCompleteToast(
  toast: (props: { title?: React.ReactNode; description?: React.ReactNode; duration?: number }) => void,
  mission: {
    title: string;
    coins: number;
    gems: number;
    xp: number;
    powerUp?: string | null;
    powerUpCount?: number;
  }
) {
  toast({
    title: (
      <MissionCompleteToast
        missionTitle={mission.title}
        coins={mission.coins}
        gems={mission.gems}
        xp={mission.xp}
        powerUp={mission.powerUp}
        powerUpCount={mission.powerUpCount}
      />
    ),
    duration: 5000,
  });
}

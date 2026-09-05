import { useEffect } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { WEEK_BONUS } from "@/hooks/useMissions";
import { STREAK_MILESTONES } from "@/hooks/useStreakMilestones";
import coinIcon from "@/assets/icons/icon-coin.png";
import gemIcon from "@/assets/icons/icon-gem.png";
import xpSparkIcon from "@/assets/level/xp-spark.png";

export type MissionInfoTopic = "weekPack" | "streak";

interface MissionInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: MissionInfoTopic;
  /** Days of this week already finished, for the week pack. */
  daysComplete?: number;
  /** The streak the player is on, so the ladder can show where they are. */
  currentStreak?: number;
}

const innerCardStyle = {
  background: "#F5FAFF",
  border: "1.5px solid #D63A9C",
};

/** A reward pill, matching the ones on the mission cards. */
function Reward({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-sm">
      <img src={icon} alt="" width={18} height={18} className="shrink-0" />
      <span className="text-sm font-bold text-[#402666]">{label}</span>
    </div>
  );
}

/**
 * What the week pack and the streak actually are.
 *
 * Both banners sat at the top of the missions sheet showing a number and
 * nothing else — 0/7 and 1 day — with no way to find out what would move
 * them or what they paid. The week pack was the worse of the two, because
 * it counts days on which every *daily* mission was finished, and it sits
 * directly above a list of weekly missions that cannot move it at all.
 */
export function MissionInfoModal({
  isOpen,
  onClose,
  topic,
  daysComplete = 0,
  currentStreak = 0,
}: MissionInfoModalProps) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const isWeek = topic === "weekPack";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 pt-[calc(1rem_+_var(--safe-top))] pb-[calc(1rem_+_var(--safe-bottom))] backdrop-blur-[2px]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[24px] bg-white p-5"
            style={{ boxShadow: "0 8px 0 #E8E4EC, 0 12px 32px rgba(0,0,0,0.18)" }}
          >
            {/* Zero-height sticky strip so the close button survives scrolling
                on a short screen — same treatment as LevelInfoModal. It is the
                only close now: the full-width one at the bottom said the same
                thing a second time and pushed the rewards it sat under off a
                short screen. Escape and the backdrop still work. */}
            <div className="sticky top-0 z-10 h-0">
              <button
                type="button"
                onClick={onClose}
                className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200"
                style={{ boxShadow: "0 2px 0 #E5E7EB" }}
                aria-label={t("common.close")}
              >
                <X className="h-4 w-4 text-gray-600" />
              </button>
            </div>

            <h2 className="px-11 text-center font-display text-2xl font-bold text-[#6D28D9]">
              {isWeek ? t("missions.weekPackage") : t("missions.streak")}
            </h2>
            <p className="mt-1.5 px-4 text-center text-sm font-semibold text-[#402666]">
              {isWeek
                ? t("missions.infoWeekProgress", { done: daysComplete })
                : t("missions.infoStreakProgress", { count: currentStreak })}
            </p>

            {/* One line saying what this is, under the count it describes.
                It used to be a "how do I get it" card of two paragraphs above
                the rewards — four sentences explaining a rule the ladder
                below already shows, which pushed the rewards themselves off
                a short screen. The rule is one sentence; it belongs with the
                heading, not in a section of its own. */}
            <p className="mt-2 px-4 text-center text-sm leading-snug text-slate-600">
              {isWeek ? t("missions.infoWeekLead") : t("missions.infoStreakLead")}
            </p>

            {/* What you get */}
            <div className="mt-4 rounded-[24px] p-5" style={innerCardStyle}>
              <h3 className="font-display text-lg font-bold text-[#1E1B2E]">
                {t("missions.infoRewardTitle")}
              </h3>

              {isWeek ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Reward icon={coinIcon} label={String(WEEK_BONUS.coins)} />
                  <Reward icon={gemIcon} label={String(WEEK_BONUS.gems)} />
                  <Reward icon={xpSparkIcon} label={`${WEEK_BONUS.xp}XP`} />
                </div>
              ) : (
                // The ladder, with the tier the player is on marked. Reading
                // it should answer "is it worth another day?" directly. These
                // are the streak page's milestones: coins, paid once each.
                <div className="mt-3 space-y-1.5">
                  {STREAK_MILESTONES.map((tier) => {
                    const reached = currentStreak >= tier.days;
                    return (
                      <div
                        key={tier.days}
                        className={`flex items-center justify-between rounded-xl px-3 py-2 ${
                          reached ? "bg-emerald-50" : "bg-white"
                        }`}
                      >
                        <span
                          className={`text-sm font-bold ${
                            reached ? "text-emerald-700" : "text-[#402666]"
                          }`}
                        >
                          {t("missions.infoStreakDays", { count: tier.days })}
                        </span>
                        <span className="text-sm font-semibold text-slate-600">
                          {t("extra.streakCoinsReward", { count: tier.coins })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

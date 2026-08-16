import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { Notification } from "@/hooks/useNotifications";
import { getMissionIcon, type MissionIconKey } from "@/hooks/useMissions";
import { useLanguage } from "@/contexts/LanguageContext";
import { translateNotificationTitle, translateNotificationMessage } from "@/utils/notificationTranslations";

import coinIcon from "@/assets/icons/icon-coin.png";
import gemIcon from "@/assets/icons/icon-gem.png";
import xpSparkIcon from "@/assets/level/xp-spark.png";
import giftIcon from "@/assets/level/gift.png";

// Mission icons, so a completed-mission notification opens with the same
// artwork the mission card shows
import iconCheck from "@/assets/missions/check.png";
import iconMap from "@/assets/missions/map.png";
import iconTarget from "@/assets/missions/target.png";
import iconShoe from "@/assets/missions/shoe.png";
import iconTrophy from "@/assets/missions/trophy.png";
import iconTv from "@/assets/missions/tv.png";
import iconHearts from "@/assets/missions/hearts.png";

import power5050 from "@/assets/powers/5050.png";
import powerFreeze from "@/assets/powers/freeze.png";
import powerReplace from "@/assets/powers/replace.png";
import { TimeIcon } from "@/components/shared/TimeIcon";
import { SunsetButton } from "@/components/shared/SunsetButton";

const MISSION_ICONS: Record<MissionIconKey, string> = {
  check: iconCheck,
  map: iconMap,
  target: iconTarget,
  shoe: iconShoe,
  trophy: iconTrophy,
  tv: iconTv,
  hearts: iconHearts,
};

const POWER_UP_ICONS: Record<string, string | null> = {
  "5050": power5050,
  freeze: powerFreeze,
  replace: powerReplace,
  "time-drain": null, // TimeIcon component instead
};

const chipStyle = { border: "1.5px solid #E8E0F5", boxShadow: "0 2px 0 #EDE6F7" };

function RewardChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div
      className="flex items-center justify-center gap-1.5 rounded-full bg-white px-3 py-2"
      style={chipStyle}
    >
      {icon}
      <span className="text-sm font-bold text-[#402666]">{label}</span>
    </div>
  );
}

interface NotificationDetailModalProps {
  notification: Notification | null;
  onClose: () => void;
}

/**
 * "What you earned" popup for reward-shaped notifications (completed
 * missions, daily rewards, streaks, level-ups, achievements). Clicking such
 * a notification used to dump the player on the home page with nothing to
 * see — this shows the actual achievement and its rewards instead.
 */
export function NotificationDetailModal({ notification, onClose }: NotificationDetailModalProps) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!notification) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [notification, onClose]);

  const data = (notification?.data || {}) as Record<string, unknown>;
  const missionId = data.mission_id as string | undefined;
  const coins = Number(data.coins || 0);
  const gems = Number(data.gems || 0);
  const xp = Number(data.xp || 0);
  const powerUp = data.power_up as string | undefined;
  const powerUpCount = Number(data.power_up_count || 0);
  const hasRewards = coins > 0 || gems > 0 || xp > 0 || (!!powerUp && powerUpCount > 0);

  const icon = missionId ? MISSION_ICONS[getMissionIcon(missionId)] : giftIcon;

  return (
    <AnimatePresence mode="wait">
      {notification && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          // Above the notifications panel (z-[9999])
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4 pt-[calc(1rem_+_var(--safe-top))] pb-[calc(1rem_+_var(--safe-bottom))] backdrop-blur-[2px]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-[24px] bg-white p-6 text-center"
            style={{ boxShadow: "0 8px 0 #E8E4EC, 0 12px 32px rgba(0,0,0,0.18)" }}
          >
            <img src={icon} alt="" className="mx-auto h-16 w-16 object-contain" />

            {hasRewards && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-600">
                  {t("missions.completedLabel")}
                </span>
              </div>
            )}

            <h2 className="mt-3 font-display text-lg font-bold text-[#402666]">
              {translateNotificationTitle(notification.type, notification.title, data)}
            </h2>

            {notification.message && (
              <p className="mt-1.5 text-sm text-slate-500">
                {translateNotificationMessage(notification.type, notification.message, data)}
              </p>
            )}

            {hasRewards && (
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                {coins > 0 && (
                  <RewardChip
                    icon={<img src={coinIcon} alt="" width={22} height={22} className="shrink-0" />}
                    label={`+${coins}`}
                  />
                )}
                {xp > 0 && (
                  <RewardChip
                    icon={<img src={xpSparkIcon} alt="" width={22} height={22} className="shrink-0" />}
                    label={`+${xp} XP`}
                  />
                )}
                {gems > 0 && (
                  <RewardChip
                    icon={<img src={gemIcon} alt="" width={22} height={22} className="shrink-0" />}
                    label={`+${gems}`}
                  />
                )}
                {!!powerUp && powerUpCount > 0 && (
                  <RewardChip
                    icon={
                      powerUp === "time-drain" ? (
                        <TimeIcon size={22} />
                      ) : (
                        <img
                          src={POWER_UP_ICONS[powerUp] || power5050}
                          alt=""
                          width={22}
                          height={22}
                          className="shrink-0"
                        />
                      )
                    }
                    label={`+${powerUpCount}`}
                  />
                )}
              </div>
            )}

            <SunsetButton
              onClick={onClose}
              className="mt-6"
            >
              {t("common.continue")}
            </SunsetButton>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default NotificationDetailModal;

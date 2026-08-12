import { t } from "@/lib/i18n";
import { useMissionStreak } from "@/hooks/useMissionStreak";
import coinPurse from "@/assets/icons/icon-coin-purse.png";
import missionsCrystal from "@/assets/figma-home/missions-crystal.png";

/**
 * The week strip: one tappable slot per day, with the daily-rewards purse
 * on the end.
 *
 * Shared by the phone card and the desktop scene stack so the two cannot
 * drift. Desktop used to carry the same days plus separate "daily missions"
 * and "open the chest" buttons; folding them into this one section is what
 * makes both surfaces the same thing.
 */

const CARD_SHADOW =
  "0px 2px 8px 0px rgba(102,51,153,0.06), 0px 8px 24px 0px rgba(102,51,153,0.12)";

const DAY_LABELS = ["ორშ", "სამ", "ოთხ", "ხუთ", "პარ", "შაბ", "კვ"];
const SLOT_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6]; // 0 = Monday

type DayState = "done" | "failed" | "pending";

export interface WeekMissionsStripProps {
  /** Opens that day's missions. Carries the day's ISO date. */
  onMissionsClick: (dateISO: string) => void;
  /** Opens daily rewards. */
  onGiftClick: () => void;
  /** Today's reward is already taken — the purse shows as spent. */
  dailyRewardClaimed?: boolean;
  /** Card height; the phone frame and the scene stack differ slightly. */
  className?: string;
}

export function WeekMissionsStrip({
  onMissionsClick,
  onGiftClick,
  dailyRewardClaimed = false,
  className = "",
}: WeekMissionsStripProps) {
  const { streak, currentStreak } = useMissionStreak();

  const today = new Date();
  const todayIdx = (today.getDay() + 6) % 7; // 0 = Monday
  const lastDone = streak?.last_completion_date || null;

  // The date a slot stands for. Anchored on the same day key mission rows
  // are stored under (mission_date is a UTC date) and stepped in whole days
  // from there, rather than rebuilt from local calendar parts: east of UTC
  // the two disagree for the first hours of the day, and the today slot
  // would open a date with no rows against it.
  const todayKey = new Date().toISOString().slice(0, 10);
  const dateOfWeekday = (weekday: number): string =>
    new Date(Date.parse(`${todayKey}T00:00:00Z`) + (weekday - todayIdx) * 86_400_000)
      .toISOString()
      .slice(0, 10);

  // A day is done while the running streak still covers it, failed once it
  // is past, pending today or ahead.
  const dayState = (weekday: number): DayState => {
    if (weekday > todayIdx) return "pending";
    if (lastDone && currentStreak > 0) {
      const dayDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - (todayIdx - weekday)
      );
      const last = new Date(`${lastDone}T00:00:00`);
      const diff = Math.round((last.getTime() - dayDate.getTime()) / 86_400_000);
      if (diff >= 0 && diff < currentStreak) return "done";
    }
    return weekday === todayIdx ? "pending" : "failed";
  };

  return (
    <div
      className={`relative w-full overflow-hidden rounded-[24px] bg-[rgba(252,247,255,0.8)] ${className}`}
      style={{ boxShadow: CARD_SHADOW }}
    >
        {/* Seven days plus the purse need more of the card than six did, so
            the row reclaims some side padding rather than shrinking the day
            labels — on a 360px phone the labels are what runs out first. */}
        <div className="absolute left-[16px] right-[14px] top-[16px] flex items-end justify-between">
          <div className="flex flex-1 items-end justify-between pr-[8px]">
          {DAY_LABELS.map((label, i) => {
            const weekday = SLOT_WEEKDAYS[i];
            const state = dayState(weekday);
            const isToday = weekday === todayIdx;
            const isFuture = weekday > todayIdx;
            return (
              <button
                key={label}
                type="button"
                onClick={() => onMissionsClick(dateOfWeekday(weekday))}
                aria-label={`${label} — ${t("missions.title")}`}
                className="flex flex-col items-center"
              >
                {isToday && state === "pending" ? (
                  /* Today: the missions crystal on the gold chip — the day
                     the player can still act on, showing what acting means.
                     Drawn 15% over the plain day slots so the one actionable
                     day in the row is the one that catches the eye. */
                  <div
                    className="flex h-[31.43px] w-[31.53px] items-start rounded-[125px]"
                    style={{
                      backgroundImage:
                        "linear-gradient(180deg, rgb(107,46,224) 8%, rgb(133,71,235) 44.8%, rgb(122,56,217) 72.4%, rgb(89,31,184) 100%)",
                    }}
                  >
                    <div className="relative flex size-[31.07px] items-center justify-center rounded-full border-[1.456px] border-solid border-[#fbbf24] shadow-[0px_2.913px_0px_0px_#b45309,0px_4.854px_11.651px_0px_rgba(245,158,11,0.5)]">
                      <div
                        aria-hidden
                        className="absolute inset-0 rounded-full"
                        style={{ backgroundImage: "linear-gradient(to bottom, #fcd34d, #f59e0b 50%, #d97706)" }}
                      />
                      <img
                        src={missionsCrystal}
                        alt=""
                        className="relative size-[27.6px] object-contain drop-shadow-[0px_1.941px_1.456px_rgba(0,0,0,0.07)]"
                      />
                      <div className="absolute left-[7.81px] top-[3.88px] size-[2.935px] rounded-full bg-white opacity-[0.73]" />
                      <div className="absolute left-[15.96px] top-[19.79px] size-[2.163px] rounded-full bg-[rgba(255,255,255,0.8)] opacity-[0.53]" />
                      <div
                        aria-hidden
                        className="absolute inset-0 rounded-full shadow-[inset_0px_1.456px_0px_0px_rgba(255,255,255,0.35)]"
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    className={`flex h-[27.328px] w-[27.42px] items-center justify-center rounded-full ${
                      state === "done"
                        ? "bg-[#10b981]"
                        : state === "failed"
                          ? "bg-[rgba(217,119,6,0.16)]"
                          : "bg-[rgba(149,129,171,0.14)]"
                    }`}
                  >
                    {state === "done" && (
                      <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" aria-hidden>
                        <path
                          d="M5 12.5l4.5 4.5L19 7.5"
                          stroke="#fff"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                    {state === "failed" && (
                      <svg viewBox="0 0 14 14" className="size-[14px]" fill="none" aria-hidden>
                        <path
                          d="M10.5 3.5L3.5 10.5M3.5 3.5l7 7"
                          stroke="#b45309"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                    {isFuture && (
                      <p className="-mt-[9px] font-['Nunito'] text-[16px] font-bold leading-[16px] tracking-[0.5px] text-[#887695]">
                        ...
                      </p>
                    )}
                  </div>
                )}
                <p
                  className={`mt-[8.73px] text-center text-[13.15px] font-semibold leading-[19.725px] tracking-[-0.16px] text-[#402666] whitespace-nowrap ${
                    isToday || isFuture ? "" : "opacity-50"
                  }`}
                >
                  {label}
                </p>
              </button>
            );
          })}
          </div>

          {/* Daily rewards (node 626:1404) */}
          {/* Spent for the day, the purse drains to grey and flattens: the
              warm gradient, the amber lip and the glow all belong to the
              state where there is something to collect. Colour alone would
              not carry it, so the artwork desaturates too. */}
          <button
            type="button"
            onClick={onGiftClick}
            aria-label={t("extra.dailyRewards")}
            className={`relative h-[62px] w-[76px] shrink-0 rounded-full border-[3px] border-solid transition-colors ${
              dailyRewardClaimed
                ? "border-[rgba(255,255,255,0.65)] shadow-[0px_2px_6px_0px_rgba(0,0,0,0.06),0px_2px_0px_0px_#cbc3d4]"
                : "border-[rgba(255,255,255,0.9)] shadow-[0px_4px_12px_0px_rgba(0,0,0,0.1),0px_3px_0px_0px_#fdba74]"
            }`}
            style={{
              backgroundImage: dailyRewardClaimed
                ? "linear-gradient(to bottom, #f4f2f7, #ded9e6)"
                : "linear-gradient(to bottom, #fff7ed, #fed7aa)",
            }}
          >
            <span className="absolute left-[17.5px] top-[2px] block h-[48px] w-[41px] overflow-hidden">
              <img
                src={coinPurse}
                alt=""
                draggable={false}
                className="absolute left-[-16.46%] h-full w-[116.46%] max-w-none transition-[filter,opacity]"
                style={
                  dailyRewardClaimed
                    ? { filter: "grayscale(1) contrast(0.9)", opacity: 0.55 }
                    : undefined
                }
              />
            </span>
          </button>
        </div>
      </div>
  );
}

import { motion } from "framer-motion";
import { PUBLIC_SHARING_ENABLED } from "@/config/features";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { NotificationTab } from "@/config/notificationTabs";

/**
 * The Activity screen's tab strip — one copy, two callers.
 *
 * There were two, identical down to the unread badge: the standalone page at
 * /notifications, and the panel the bell opens from every header. Which is
 * one too many, and it showed the moment the strip was asked to grow — the
 * page grew and the panel did not, so the tabs a player actually reaches (the
 * bell is on Discover, Leaderboards, Profile and Team; the page is not linked
 * from anywhere obvious) stayed exactly as they were.
 *
 * It wears the lobby's own tab strip now — the one under "Game rules /
 * Players" (UniversalLobby): the lilac track with its 8px foot, the tab
 * pills with the category chip's asymmetric corner scooped per side, display
 * type in the lobby's purple, and the active pill sliding between them. The
 * icon-and-grey Radix strip it had matched nothing else the player had just
 * been looking at (owner: "show activity tabs with styles what we have in
 * our lobby game rules / players tab").
 *
 * The two callers keep their own translation keys, because they have separate
 * ones and both are already translated in seven languages; everything else
 * about the strip lives here.
 */
export interface NotificationTabLabels {
  games: string;
  social: string;
  trivia: string;
}

interface NotificationTabsProps {
  activeTab: NotificationTab;
  onTabChange: (tab: NotificationTab) => void;
  /** Unread count for a tab, drawn as a badge when it is above zero. */
  unreadCount: (tab: NotificationTab) => number;
  labels: NotificationTabLabels;
}

/** The lobby's track: lilac stroke, 77% white, a 10px inset and an 8px foot. */
export const LOBBY_TAB_TRACK =
  "flex items-center gap-[6px] rounded-[28px] border border-[#ceb8e4] bg-[rgba(255,255,255,0.77)] p-[10px] shadow-[0px_8px_0px_0px_#d0bbe3] backdrop-blur-md";
/** The lobby's tab: 52px tall, display type, the lobby's purple. */
export const LOBBY_TAB =
  "relative flex h-[52px] flex-1 items-center justify-center px-[10px] text-center font-display text-[18px] leading-[26px] text-[#402666]";
/** The lobby's active pill. */
export const LOBBY_TAB_PILL = "absolute inset-0 border border-[#d1a7dc] bg-[rgba(240,218,245,0.22)]";

/**
 * The category chip's asymmetric corner, mirrored per side: the first tab
 * scoops its outer corner — bottom-left — the last its bottom-right, and any
 * tab between them is plain (the lobby has two; this strip may have three).
 */
export function lobbyTabRadius(index: number, count: number): string {
  if (index === 0) return "rounded-tl-[24px] rounded-tr-[24px] rounded-br-[24px] rounded-bl-[54px]";
  if (index === count - 1) return "rounded-tl-[24px] rounded-tr-[24px] rounded-bl-[24px] rounded-br-[54px]";
  return "rounded-[24px]";
}

/** Grows with the label — a speck of a badge against 18px type reads as dirt, not a count. */
const BADGE =
  "ml-1.5 min-w-[20px] h-[20px] px-1.5 rounded-full bg-[#7126d5] text-white text-[12px] font-bold leading-none flex items-center justify-center font-[Nunito]";

export function NotificationTabs({
  activeTab,
  onTabChange,
  unreadCount,
  labels,
}: NotificationTabsProps) {
  useLanguage(); // re-render on a language change; the labels come from the caller

  // Likes, saves and plays on published trivias — nothing can produce one
  // while public sharing is hidden, so the tab goes with it.
  const tabs: { key: NotificationTab; label: string }[] = [
    { key: "games", label: labels.games },
    { key: "social", label: labels.social },
    ...(PUBLIC_SHARING_ENABLED ? [{ key: "trivia" as NotificationTab, label: labels.trivia }] : []),
  ];

  return (
    <div className={cn(LOBBY_TAB_TRACK, "w-full")} role="tablist">
      {tabs.map(({ key, label }, i) => {
        const active = activeTab === key;
        const radius = lobbyTabRadius(i, tabs.length);
        const count = unreadCount(key);
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onTabChange(key)}
            className={cn(LOBBY_TAB, radius, active ? "font-bold" : "font-normal")}
          >
            {active && (
              <motion.span
                layoutId="activity-tab-pill"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className={cn(LOBBY_TAB_PILL, radius)}
              />
            )}
            <span className="relative flex items-center truncate">
              {label}
              {count > 0 && <span className={BADGE}>{count}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

import { Gamepad2, Users, Sparkles } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PUBLIC_SHARING_ENABLED } from "@/config/features";
import { useLanguage } from "@/contexts/LanguageContext";
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

/** py-3 and 13px: the sheet this sits in has nothing else as small as py-2. */
const TRIGGER =
  "flex items-center gap-1.5 text-[13px] py-3 data-[state=active]:bg-background";
const ICON = "w-[15px] h-[15px]";
/** Grows with the label — 10px against 13px type reads as a speck, not a count. */
const BADGE =
  "ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[11px] flex items-center justify-center font-medium";

export function NotificationTabs({
  activeTab,
  onTabChange,
  unreadCount,
  labels,
}: NotificationTabsProps) {
  useLanguage(); // re-render on a language change; the labels come from the caller

  const trigger = (
    value: NotificationTab,
    label: string,
    Icon: typeof Gamepad2,
  ) => (
    <TabsTrigger value={value} className={TRIGGER}>
      <Icon className={ICON} />
      <span>{label}</span>
      {unreadCount(value) > 0 && <span className={BADGE}>{unreadCount(value)}</span>}
    </TabsTrigger>
  );

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => onTabChange(v as NotificationTab)}
      className="w-full"
    >
      <TabsList
        className={`grid ${PUBLIC_SHARING_ENABLED ? "grid-cols-3" : "grid-cols-2"} w-full bg-card/60 backdrop-blur-sm rounded-xl p-1 h-auto`}
      >
        {trigger("games", labels.games, Gamepad2)}
        {trigger("social", labels.social, Users)}
        {/* Likes, saves and plays on published trivias — nothing can produce
            one while public sharing is hidden, so the tab goes with it. */}
        {PUBLIC_SHARING_ENABLED && trigger("trivia", labels.trivia, Sparkles)}
      </TabsList>
    </Tabs>
  );
}

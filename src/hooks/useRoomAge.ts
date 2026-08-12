import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ka, enUS } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * "3 წუთის წინ" for a room's creation time, refreshed as it ages.
 *
 * A minute-old room reads as a minute old for a whole minute, so the label
 * re-renders on a timer rather than only when the list happens to re-fetch —
 * otherwise a card can sit at "1 წუთის წინ" for an hour.
 */
export function useRoomAge(createdAt: string | null | undefined): string {
  const { language } = useLanguage();
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!createdAt) return;
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, [createdAt]);

  if (!createdAt) return "";
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";

  return formatDistanceToNow(date, {
    addSuffix: true,
    locale: language === "ka" ? ka : enUS,
  });
}

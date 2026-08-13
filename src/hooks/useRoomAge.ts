import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { roomAgeLabel } from "@/utils/roomAge";

/**
 * A room's age for its card badge, re-rendered as it ages.
 *
 * The minute ticks on a timer rather than only when the list re-fetches —
 * otherwise a card would still read "1წთ" an hour later.
 */
export function useRoomAge(createdAt: string | null | undefined): string {
  const { t } = useLanguage();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!createdAt) return;
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [createdAt]);

  const label = roomAgeLabel(createdAt, now);
  if (!label) return "";
  return label.count === undefined
    ? t(label.key)
    : t(label.key).replace("{count}", String(label.count));
}

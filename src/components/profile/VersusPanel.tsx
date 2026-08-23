import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { useLanguage } from "@/contexts/LanguageContext";
import type { HeadToHead, Specialty } from "@/hooks/usePlayerProfile";

interface VersusPanelProps {
  headToHead: HeadToHead | null;
  specialty: Specialty | null;
  /** The viewer, on the left of the VS. */
  me: { nickname?: string | null; avatarUrl?: string | null };
  /** The player whose profile this is, on the right. */
  them: { nickname?: string | null; avatarUrl?: string | null };
}

/**
 * "How have we done against each other, and what are they good at."
 *
 * The profile used to answer neither. It listed what a player had made and
 * nothing about the two of you, which is the first thing anyone opening
 * someone else's profile actually wants.
 *
 * A win is the higher score in a match you both played — decided server-side
 * in head_to_head_record, and deliberately not "who won the room": in a room
 * of eight, finishing above someone is beating them even though a third
 * player took it. Draws are counted but only shown when there are any, since
 * for most pairs the line would otherwise always read "0 draws".
 */
export function VersusPanel({ headToHead, specialty, me, them }: VersusPanelProps) {
  const { t } = useLanguage();

  // Nothing to say yet: no shared matches and no established category. Better
  // an absent panel than two zeros and an empty bar.
  const hasRecord = !!headToHead && headToHead.matchesTogether > 0;
  if (!hasRecord && !specialty) return null;

  const percent = specialty ? Math.round(specialty.accuracy * 100) : 0;

  return (
    <div className="w-full max-w-sm mt-5 space-y-4">
      {hasRecord && (
        <div>
          <p className="text-center text-xs text-muted-foreground mb-2">
            {t("extra.playedTogetherCount", { count: headToHead!.matchesTogether })}
          </p>

          <div className="flex items-center justify-between gap-2 rounded-2xl border border-border/60 bg-card/60 px-4 py-3">
            {/* Me */}
            <div className="flex flex-1 flex-col items-center gap-1 min-w-0">
              <span className="text-2xl font-display font-bold text-foreground leading-none">
                {headToHead!.myWins}
              </span>
              <span className="text-[11px] text-muted-foreground">{t("extra.victoriesLabel")}</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <SmartAvatar avatarUrl={me.avatarUrl ?? undefined} fallback={me.nickname || "?"} size="sm" />
              <span className="rounded-full bg-foreground px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-background">
                {t("extra.versusShort")}
              </span>
              <SmartAvatar avatarUrl={them.avatarUrl ?? undefined} fallback={them.nickname || "?"} size="sm" />
            </div>

            {/* Them */}
            <div className="flex flex-1 flex-col items-center gap-1 min-w-0">
              <span className="text-2xl font-display font-bold text-foreground leading-none">
                {headToHead!.theirWins}
              </span>
              <span className="text-[11px] text-muted-foreground">{t("extra.victoriesLabel")}</span>
            </div>
          </div>

          {headToHead!.draws > 0 && (
            <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
              {t("extra.drawsCount", { count: headToHead!.draws })}
            </p>
          )}
        </div>
      )}

      {specialty && (
        <div className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <DynamicIcon slug={specialty.iconSlug ?? undefined} categoryId={specialty.slug} size={26} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">{t("extra.theirSpecialty")}</p>
              <p className="truncate text-sm font-bold text-foreground">{specialty.name}</p>
            </div>
            <span className="shrink-0 text-sm font-bold text-primary">
              {t("extra.percentSuccess", { percent })}
            </span>
          </div>
          <div
            className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

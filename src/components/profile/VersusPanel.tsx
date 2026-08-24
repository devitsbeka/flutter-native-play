import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { CategoryArtwork } from "@/components/shared/CategoryArtwork";
import { useLanguage } from "@/contexts/LanguageContext";
import type { HeadToHead, PlayerFacts } from "@/hooks/usePlayerProfile";

interface VersusPanelProps {
  headToHead: HeadToHead | null;
  facts: PlayerFacts | null;
  /** The viewer, on the left of the VS. */
  me: { nickname?: string | null; avatarUrl?: string | null };
  /** The player whose profile this is, on the right. */
  them: { nickname?: string | null; avatarUrl?: string | null };
}

/**
 * Whether there is anything worth putting on the Info tab.
 *
 * Exported because the tab strip has to decide before rendering: a tab that
 * opens onto nothing is worse than no tab, and this is the profile's landing
 * tab when it does have something.
 */
export function hasVersusContent(
  headToHead: HeadToHead | null,
  facts: PlayerFacts | null,
): boolean {
  return (
    (!!headToHead && headToHead.matchesTogether > 0) ||
    (!!facts && facts.answered > 0)
  );
}

/** One number and its label. Fixed height so a pair of them lines up. */
function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-card/60 px-3 py-4 text-center">
      <span className="font-display text-2xl font-bold leading-none text-foreground">{value}</span>
      {/* Two lines allowed: "Questions answered" does not fit on one in
          several languages, and truncating a stat label reads as broken. */}
      <span className="mt-1.5 text-[11px] leading-tight text-muted-foreground">{label}</span>
    </div>
  );
}

/**
 * "How have we done against each other, and what are they like as a player."
 *
 * A win is the higher score in a match you both played — decided server-side
 * in head_to_head_record, and deliberately not "who won the room": in a room
 * of eight, finishing above someone is beating them even though a third
 * player took it. Draws are counted but only shown when there are any, since
 * for most pairs the line would otherwise always read "0 draws".
 */
export function VersusPanel({ headToHead, facts, me, them }: VersusPanelProps) {
  const { t } = useLanguage();

  if (!hasVersusContent(headToHead, facts)) return null;

  const hasRecord = !!headToHead && headToHead.matchesTogether > 0;
  const specialty = facts?.specialty ?? null;
  const specialtyPercent = specialty ? Math.round(specialty.accuracy * 100) : 0;

  return (
    <div className="w-full space-y-3">
      {hasRecord && (
        <div>
          <p className="mb-2 text-center text-xs text-muted-foreground">
            {t("extra.playedTogetherCount", { count: headToHead!.matchesTogether })}
          </p>

          <div className="flex items-center justify-between gap-2 rounded-2xl border border-border/60 bg-card/60 px-4 py-3">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span className="font-display text-2xl font-bold leading-none text-foreground">
                {headToHead!.myWins}
              </span>
              <span className="text-[11px] text-muted-foreground">{t("extra.victoriesLabel")}</span>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <SmartAvatar avatarUrl={me.avatarUrl ?? undefined} fallback={me.nickname || "?"} size="sm" />
              <span className="rounded-full bg-foreground px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-background">
                {t("extra.versusShort")}
              </span>
              <SmartAvatar avatarUrl={them.avatarUrl ?? undefined} fallback={them.nickname || "?"} size="sm" />
            </div>

            <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span className="font-display text-2xl font-bold leading-none text-foreground">
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

      {/* The three facts. Two numbers share a row; the specialty takes the
          full width under them because a category name is long enough to
          wrap awkwardly in a third of it. */}
      {facts && facts.answered > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            value={facts.answered.toLocaleString()}
            label={t("extra.questionsAnsweredLabel")}
          />
          <StatTile
            value={facts.accuracy === null ? "—" : `${Math.round(facts.accuracy * 100)}%`}
            label={t("extra.successRateLabel")}
          />
        </div>
      )}

      {specialty && (
        <div className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              {/* CategoryArtwork, not DynamicIcon: the six picture-guess
                  categories carry generic stand-ins in icon_slug — globe,
                  magnifier, running man — so asking the icon library for
                  "guess the logo" answers with a magnifying glass. The bundled
                  art is the category's real picture, and CategoryArtwork falls
                  back to the library for everything else. */}
              <CategoryArtwork categoryId={specialty.slug} iconSlug={specialty.iconSlug} size={26} className="drop-shadow-none" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">{t("extra.theirSpecialty")}</p>
              <p className="truncate text-sm font-bold text-foreground">{specialty.name}</p>
            </div>
            <span className="shrink-0 text-sm font-bold text-primary">
              {t("extra.percentSuccess", { percent: specialtyPercent })}
            </span>
          </div>
          <div
            className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={specialtyPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${specialtyPercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

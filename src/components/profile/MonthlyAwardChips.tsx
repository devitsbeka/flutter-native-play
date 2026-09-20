import { useLanguage } from "@/contexts/LanguageContext";
import { countryName } from "@/utils/countryName";
import { formatPeriod, medalForRank } from "@/config/leaderboardMonthly";
import { useMonthlyAwards, type MonthlyAward } from "@/hooks/useMonthlyAwards";

/**
 * The leaderboard places somebody has taken, under their name.
 *
 * A row of chips rather than a section, and deliberately so. The profile's
 * trophy grid and stats panel were taken out on purpose — "a profile is who
 * someone is and the way to play them, not a scoreboard" — and putting a
 * scoreboard back under a new name would undo that. Finishing top three in a
 * month is a different thing from a stat: it happened once, to one person,
 * and it is part of who they are (owner: "on users public profile show that
 * achievement like 1st place in leaderboard").
 *
 * So: at most two chips, one line, no heading, and nothing at all for the
 * overwhelming majority of players who have never placed.
 *
 * Awards are world-readable, which is what makes this work on somebody
 * else's profile.
 */

/** Best first: rank wins, then the more recent month. */
function bestFirst(a: MonthlyAward, b: MonthlyAward): number {
  if (a.rank !== b.rank) return a.rank - b.rank;
  if (a.scope !== b.scope) return a.scope === "global" ? -1 : 1;
  return b.period.localeCompare(a.period);
}

const CHIP_STYLES: Record<number, string> = {
  1: "bg-amber-100 text-amber-900 border-amber-300",
  2: "bg-slate-100 text-slate-700 border-slate-300",
  3: "bg-orange-100 text-orange-900 border-orange-300",
};

export function MonthlyAwardChips({ userId }: { userId?: string | null }) {
  const { t, language } = useLanguage();
  const { awards, loading } = useMonthlyAwards(userId);

  if (loading || awards.length === 0) return null;

  const ranked = [...awards].sort(bestFirst);
  const shown = ranked.slice(0, 2);

  return (
    <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
      {shown.map((award) => {
        // How many times this exact place has been taken, on this board. The
        // chip says the most recent month and carries the count, rather than
        // becoming three chips that all say the same thing.
        const repeats = awards.filter(
          (a) => a.rank === award.rank && a.scope === award.scope,
        ).length;

        const where =
          award.scope === "global"
            ? t("leaderboard.global")
            : countryName(award.country_code ?? "", language, award.country_code ?? "");

        return (
          <span
            key={award.id}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
              CHIP_STYLES[award.rank] ?? CHIP_STYLES[3]
            }`}
            title={t("extra.monthAwardTitle", {
              rank: award.rank,
              where,
              month: formatPeriod(award.period, language),
            })}
          >
            <span aria-hidden>{medalForRank(award.rank)}</span>
            <span>
              #{award.rank} {where}
            </span>
            <span className="opacity-60">{formatPeriod(award.period, language)}</span>
            {repeats > 1 && <span className="opacity-80">×{repeats}</span>}
          </span>
        );
      })}
    </div>
  );
}

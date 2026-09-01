import { useEffect, useState } from "react";
import { Flag, Loader2, Check } from "lucide-react";
import { GameModal } from "@/components/ui/game-modal";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/contexts/SoundContext";
import { supabase } from "@/integrations/supabase/client";
import type { WordsLanguage } from "./levels";

/**
 * What a word on the board means.
 *
 * Tap a filled word and this asks Wiktionary in the board's language for
 * its entry, and shows the first few lines that read as a definition. The
 * banks come from dictionaries, not from a glossary, so this is looked up
 * rather than shipped — 4,200 levels of glosses in seven languages would
 * weigh more than the game. Georgian falls back to the English Wiktionary,
 * whose Georgian entries are where the Georgian bank's lemmas came from.
 *
 * The flag reports the word. Reports land in `words_word_reports` once
 * that migration is applied; until then they go to `user_reports`, which
 * the admin Reports page already lists, filed against the reporter.
 */

const WIKI: Record<WordsLanguage, string> = {
  en: "en",
  ka: "ka",
  es: "es",
  fr: "fr",
  de: "de",
  it: "it",
  pt: "pt",
};

/** The title form Wiktionary uses: lower case, accents as written. */
const titleFor = (lang: WordsLanguage, word: string) => (lang === "ka" ? word : word.toLowerCase());

async function fetchExtract(wiki: string, title: string): Promise<string | null> {
  const url =
    `https://${wiki}.wiktionary.org/w/api.php?action=query&prop=extracts&explaintext=1&redirects=1` +
    `&format=json&origin=*&titles=${encodeURIComponent(title)}`;
  // A lookup is a nicety; six seconds is as long as anyone waits for one.
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), 6000);
  let res: Response;
  try {
    res = await fetch(url, { signal: ctrl.signal });
  } finally {
    window.clearTimeout(timer);
  }
  if (!res.ok) return null;
  const data = (await res.json()) as { query?: { pages?: Record<string, { extract?: string; missing?: string }> } };
  const page = Object.values(data.query?.pages ?? {})[0];
  if (!page || page.missing !== undefined || !page.extract) return null;
  return page.extract;
}

/** The first lines of an extract that look like meanings, not headings. */
function pickDefinition(extract: string, max = 3): string[] {
  const lines = extract
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("=") && !/^(\d+\.\d+|Etymology|Pronunciation|IPA|References|See also|Anagrams|Declension|Conjugation)/i.test(l));
  const out: string[] = [];
  for (const line of lines) {
    if (line.length < 4 || line.length > 220) continue;
    out.push(line.replace(/\s+/g, " "));
    if (out.length >= max) break;
  }
  return out;
}

interface Props {
  word: string | null;
  lang: WordsLanguage;
  levelNumber: number;
  onClose: () => void;
}

export function WordInfoModal({ word, lang, levelNumber, onClose }: Props) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { playSound } = useSound();
  const [lines, setLines] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [reported, setReported] = useState(false);
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    if (!word) return;
    let alive = true;
    setLines(null);
    setReported(false);
    setLoading(true);
    void (async () => {
      try {
        const title = titleFor(lang, word);
        let extract = await fetchExtract(WIKI[lang], title).catch(() => null);
        if (!extract && lang !== "en") extract = await fetchExtract("en", title).catch(() => null);
        if (!alive) return;
        setLines(extract ? pickDefinition(extract) : []);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [word, lang]);

  const report = async () => {
    if (!word || reporting || reported) return;
    setReporting(true);
    playSound("button-click");
    try {
      const note = `${lang}:${word}:level ${levelNumber}`;
      const first = await supabase.from("words_word_reports" as never).insert({
        user_id: user?.id ?? null,
        lang,
        word,
        level: levelNumber,
      } as never);
      if (first.error && user) {
        await supabase.from("user_reports").insert({
          reporter_id: user.id,
          reported_user_id: user.id,
          report_type: "words_word",
          description: note,
        });
      }
    } catch (e) {
      console.warn("[Words] report failed", e);
    } finally {
      setReporting(false);
      setReported(true);
    }
  };

  return (
    <GameModal
      isOpen={!!word}
      onClose={onClose}
      fullScreen={false}
      variant="info"
      title={word ?? ""}
      subtitle={t("words.wordInfoSubtitle")}
      primaryLabel={t("common.close")}
      onPrimaryClick={onClose}
    >
      <div className="min-h-[72px] text-left">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-4 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("words.lookingUp")}
          </div>
        ) : lines && lines.length > 0 ? (
          <ul className="space-y-1.5 text-[15px] leading-snug text-gray-700">
            {lines.map((l, i) => (
              <li key={i} className="rounded-xl bg-primary/5 px-3 py-2">
                {l}
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-3 text-center text-sm text-gray-500">{t("words.noDefinition")}</p>
        )}
      </div>

      <button
        onClick={() => void report()}
        disabled={reporting || reported}
        className={`mt-4 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors ${
          reported ? "bg-success/10 text-success" : "bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        }`}
      >
        {reported ? <Check className="h-4 w-4" /> : <Flag className="h-4 w-4" />}
        {reported ? t("words.reportThanks") : t("words.reportWord")}
      </button>
    </GameModal>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Shuffle, Eye, EyeOff } from "lucide-react";

/**
 * Social Frames — post templates at each network's exact pixel size, filled
 * with a real question from the production pool, so daily content is a
 * screenshot instead of a design session.
 *
 * The sizes mirror the social playbook: one 9:16 master serves TikTok, Reels,
 * Shorts and Stories; 4:5 serves the IG/FB feed; the rest are per-network
 * crops. Frames render at true pixel dimensions and are scaled down with a
 * CSS transform, so a browser screenshot of the unscaled frame (or a
 * screenshot tool set to the frame's box) is already the right size.
 *
 * Everything inside a frame is styled with literal colors, not theme tokens:
 * a post must look identical whether the admin runs light or dark.
 */

interface Question {
  id: string;
  question_text: string;
  correct_answer: string;
  incorrect_answers: unknown;
  difficulty: string;
  category_id: string;
}

const LANGUAGES = ["ka", "en", "de", "es", "fr", "it", "pt"] as const;

const FORMATS = [
  { key: "story", label: "Story / Reel / TikTok / Short", w: 1080, h: 1920 },
  { key: "portrait", label: "IG · FB Feed", w: 1080, h: 1350 },
  { key: "square", label: "Square", w: 1080, h: 1080 },
  { key: "link", label: "FB Link / Open Graph", w: 1200, h: 630 },
  { key: "x", label: "X Post", w: 1600, h: 900 },
  { key: "yt", label: "YouTube Thumbnail", w: 1280, h: 720 },
] as const;

/** The frame's own copy, per app language, so a Georgian post is Georgian. */
const FRAME_COPY: Record<string, { eyebrow: string; cta: string }> = {
  ka: { eyebrow: "დღის კითხვა", cta: "უპასუხე აპლიკაციაში" },
  en: { eyebrow: "Question of the Day", cta: "Answer in the app" },
  de: { eyebrow: "Frage des Tages", cta: "Antworte in der App" },
  es: { eyebrow: "Pregunta del día", cta: "Responde en la app" },
  fr: { eyebrow: "Question du jour", cta: "Répondez dans l'app" },
  it: { eyebrow: "Domanda del giorno", cta: "Rispondi nell'app" },
  pt: { eyebrow: "Pergunta do dia", cta: "Responda no app" },
};

/** Stable per-question shuffle so the same question always shows the same order. */
function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (const ch of seed) h = (h ^ ch.charCodeAt(0)) * 16777619;
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Brand colors as literals — frames must not follow the admin theme. */
const INK = {
  bgFrom: "hsl(263 60% 52%)",
  bgTo: "hsl(263 55% 34%)",
  card: "rgba(255 255 255 / 0.14)",
  cardBorder: "rgba(255 255 255 / 0.22)",
  text: "#FFFFFF",
  dim: "rgba(255 255 255 / 0.72)",
  accent: "hsl(30 95% 58%)",
} as const;

function QotdFrame({
  w,
  h,
  question,
  answers,
  reveal,
  lang,
  dateLabel,
}: {
  w: number;
  h: number;
  question: Question;
  answers: string[];
  reveal: boolean;
  lang: string;
  dateLabel: string;
}) {
  const wide = w / h > 1.2;
  const copy = FRAME_COPY[lang] ?? FRAME_COPY.en;
  // Long questions shrink; the breakpoints were eyeballed against the pool.
  const qLen = question.question_text.length;
  const base = wide ? Math.round(h / 11) : Math.round(w / 13);
  const qSize = qLen > 140 ? Math.round(base * 0.62) : qLen > 80 ? Math.round(base * 0.78) : base;
  const answerSize = Math.round((wide ? h : w) / (wide ? 26 : 30));
  const pad = Math.round(w * (wide ? 0.05 : 0.08));

  const letters = ["A", "B", "C", "D"];

  const answerCards = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: wide ? "1fr" : "1fr 1fr",
        gap: Math.round(w * 0.018),
        width: "100%",
      }}
    >
      {answers.map((a, i) => {
        const isCorrect = a === question.correct_answer;
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: Math.round(answerSize * 0.5),
              background: INK.card,
              border: `2px solid ${reveal && isCorrect ? INK.accent : INK.cardBorder}`,
              boxShadow: reveal && isCorrect ? `0 0 0 6px ${INK.accent}44` : undefined,
              borderRadius: Math.round(answerSize * 0.8),
              padding: `${Math.round(answerSize * 0.55)}px ${Math.round(answerSize * 0.7)}px`,
              color: INK.text,
              fontSize: answerSize,
              fontWeight: 600,
              lineHeight: 1.25,
              minWidth: 0,
            }}
          >
            <span
              style={{
                flexShrink: 0,
                width: Math.round(answerSize * 1.6),
                height: Math.round(answerSize * 1.6),
                borderRadius: "50%",
                background: reveal && isCorrect ? INK.accent : "rgba(255 255 255 / 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: Math.round(answerSize * 0.85),
                fontWeight: 800,
              }}
            >
              {letters[i]}
            </span>
            <span style={{ overflowWrap: "break-word", minWidth: 0 }}>{a}</span>
          </div>
        );
      })}
    </div>
  );

  const header = (
    <div style={{ display: "flex", flexDirection: "column", gap: Math.round(w * 0.012) }}>
      <div
        style={{
          alignSelf: "flex-start",
          background: INK.accent,
          color: "#2B1A05",
          fontSize: Math.round(base * 0.42),
          fontWeight: 800,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          padding: `${Math.round(base * 0.18)}px ${Math.round(base * 0.45)}px`,
          borderRadius: 999,
        }}
      >
        {copy.eyebrow}
      </div>
      <div style={{ color: INK.dim, fontSize: Math.round(base * 0.38), fontWeight: 600 }}>
        {dateLabel}
      </div>
    </div>
  );

  const questionBlock = (
    <div
      style={{
        color: INK.text,
        fontSize: qSize,
        fontWeight: 800,
        lineHeight: 1.18,
        overflowWrap: "break-word",
      }}
    >
      {question.question_text}
    </div>
  );

  const footer = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        color: INK.text,
      }}
    >
      <div style={{ fontSize: Math.round(base * 0.5), fontWeight: 800 }}>
        My<span style={{ color: INK.accent }}>Trivia</span>
      </div>
      <div style={{ color: INK.dim, fontSize: Math.round(base * 0.36), fontWeight: 600 }}>
        {copy.cta} · mytrivia.io
      </div>
    </div>
  );

  return (
    <div
      style={{
        width: w,
        height: h,
        background: `radial-gradient(circle at 85% -10%, rgba(255 255 255 / 0.16), transparent 45%), linear-gradient(150deg, ${INK.bgFrom} 0%, ${INK.bgTo} 100%)`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: pad,
        overflow: "hidden",
        fontFamily: "inherit",
      }}
    >
      {wide ? (
        <div style={{ display: "flex", gap: pad, flex: 1, minHeight: 0 }}>
          <div
            style={{
              flex: 1.15,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minWidth: 0,
            }}
          >
            {header}
            {questionBlock}
            {footer}
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", minWidth: 0 }}>
            {answerCards}
          </div>
        </div>
      ) : (
        <>
          {header}
          {questionBlock}
          {answerCards}
          {footer}
        </>
      )}
    </div>
  );
}

export default function SocialFrames() {
  const [lang, setLang] = useState<string>("ka");
  const [pool, setPool] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPool = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("questions")
        .select("id, question_text, correct_answer, incorrect_answers, difficulty, category_id")
        .eq("language", lang)
        .eq("is_active", true)
        .eq("in_production", true)
        .limit(60);
      if (err) throw err;
      const rows = (data ?? []) as Question[];
      setPool(rows);
      setIndex(rows.length ? Math.floor(Math.random() * rows.length) : 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load questions");
      setPool([]);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    fetchPool();
  }, [fetchPool]);

  const question = pool[index];

  const answers = useMemo(() => {
    if (!question) return [];
    const incorrect = Array.isArray(question.incorrect_answers)
      ? (question.incorrect_answers as string[]).filter((a) => typeof a === "string")
      : [];
    return seededShuffle([question.correct_answer, ...incorrect.slice(0, 3)], question.id);
  }, [question]);

  const dateLabel = useMemo(
    () =>
      new Date().toLocaleDateString(lang === "ka" ? "ka-GE" : lang, {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [lang],
  );

  const shuffle = () => {
    if (pool.length > 1) {
      let next = index;
      while (next === index) next = Math.floor(Math.random() * pool.length);
      setIndex(next);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Social Frames</h1>
        <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
          Question of the Day on every network&apos;s canvas, at its exact pixel size. Screenshot
          the frame you need — the 9:16 one covers TikTok, Reels, Shorts and Stories from a single
          render.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border overflow-hidden">
          {LANGUAGES.map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-1.5 text-sm font-medium uppercase ${
                l === lang ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={shuffle} disabled={pool.length < 2}>
          <Shuffle className="w-4 h-4 mr-2" />
          Another question
        </Button>
        <Button variant="outline" size="sm" onClick={() => setReveal((r) => !r)}>
          {reveal ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
          {reveal ? "Hide answer" : "Reveal answer"}
        </Button>
        {question && (
          <span className="text-xs text-muted-foreground">
            {pool.length} in pool · difficulty {question.difficulty}
          </span>
        )}
      </div>

      {loading && <p className="text-muted-foreground">Loading questions…</p>}
      {error && <p className="text-destructive text-sm">{error}</p>}
      {!loading && !error && !question && (
        <p className="text-muted-foreground text-sm">
          No active in-production questions for “{lang}”.
        </p>
      )}

      {question && (
        <div className="flex flex-wrap gap-8 items-start">
          {FORMATS.map((f) => {
            // Preview width caps the on-screen size; the inner frame is real pixels.
            const previewW = f.w >= f.h ? 480 : 300;
            const scale = previewW / f.w;
            return (
              <figure key={f.key} className="m-0">
                <figcaption className="mb-2 text-sm font-medium">
                  {f.label}{" "}
                  <span className="text-muted-foreground font-normal">
                    {f.w}×{f.h}
                  </span>
                </figcaption>
                <div
                  className="rounded-lg overflow-hidden ring-1 ring-border shadow-sm"
                  style={{ width: f.w * scale, height: f.h * scale }}
                >
                  <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
                    <QotdFrame
                      w={f.w}
                      h={f.h}
                      question={question}
                      answers={answers}
                      reveal={reveal}
                      lang={lang}
                      dateLabel={dateLabel}
                    />
                  </div>
                </div>
              </figure>
            );
          })}
        </div>
      )}
    </div>
  );
}

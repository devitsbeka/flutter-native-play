import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Shuffle, Eye, EyeOff } from "lucide-react";
import { QotdFrame, seededShuffle, type Question } from "@/components/social/QotdFrame";

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
 * The frame itself lives in @/components/social/QotdFrame so the posting
 * pipeline can render the identical component headlessly.
 */

const LANGUAGES = ["ka", "en", "de", "es", "fr", "it", "pt"] as const;

const FORMATS = [
  { key: "story", label: "Story / Reel / TikTok / Short", w: 1080, h: 1920 },
  { key: "portrait", label: "IG · FB Feed", w: 1080, h: 1350 },
  { key: "square", label: "Square", w: 1080, h: 1080 },
  { key: "link", label: "FB Link / Open Graph", w: 1200, h: 630 },
  { key: "x", label: "X Post", w: 1600, h: 900 },
  { key: "yt", label: "YouTube Thumbnail", w: 1280, h: 720 },
] as const;

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

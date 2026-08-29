import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Shuffle, Eye, EyeOff } from "lucide-react";
import { seededShuffle, type Question } from "@/components/social/QotdFrame";
import { StarQuestionFrame } from "@/components/social/StarQuestionFrame";
import "@/components/social/star-frame.css";

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

/**
 * One entry per surface the pipeline posts to, at the size that network
 * renders best, with the platform chrome's keep-clear zones (safeInsets, in
 * canvas px) so nothing important sits under UI:
 *  - IG Stories/Reels: ~250px of UI at the top, ~310px at the bottom
 *  - TikTok: ~140px right rail (like/comment/share), ~500px caption zone at
 *    the bottom, ~130px top
 *  - YouTube Shorts: title/controls, ~120px top / ~360px bottom
 * Feed and thumbnail canvases have no overlaid chrome.
 */
const FORMATS: {
  key: string;
  label: string;
  w: number;
  h: number;
  safeInsets?: { top?: number; bottom?: number; left?: number; right?: number };
}[] = [
  { key: "ig-feed", label: "Instagram · FB Feed (4:5)", w: 1080, h: 1350 },
  {
    key: "ig-story",
    label: "IG Story / Reel",
    w: 1080,
    h: 1920,
    safeInsets: { top: 250, bottom: 310 },
  },
  {
    key: "tiktok",
    label: "TikTok",
    w: 1080,
    h: 1920,
    safeInsets: { top: 130, bottom: 500, right: 140 },
  },
  {
    key: "yt-short",
    label: "YouTube Short",
    w: 1080,
    h: 1920,
    safeInsets: { top: 120, bottom: 360 },
  },
  { key: "square", label: "IG · FB Square", w: 1080, h: 1080 },
  { key: "fb-land", label: "Facebook Landscape / Link", w: 1200, h: 630 },
  { key: "yt-thumb", label: "YouTube Thumbnail", w: 1280, h: 720 },
  { key: "appstore", label: "App Store 6.5″", w: 1242, h: 2688 },
];

export default function SocialFrames() {
  const [lang, setLang] = useState<string>("ka");
  const [pool, setPool] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [showSafeZones, setShowSafeZones] = useState(false);
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
          The Step07 post design on every canvas the pipeline posts to, at exact pixel size and
          with each platform&apos;s keep-clear zones respected. Scroll sideways through the
          carousel; screenshot the frame you need.
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
        <Button variant="outline" size="sm" onClick={() => setShowSafeZones((z) => !z)}>
          {showSafeZones ? "Hide safe zones" : "Show safe zones"}
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
        /* One horizontal carousel: every canvas at the same preview height,
           side by side, scrolled through sideways. The inner frame is still
           real pixels scaled down, so a screenshot of the unscaled frame is
           already post-ready. */
        <div className="flex gap-8 items-start overflow-x-auto snap-x snap-mandatory pb-4 -mx-6 px-6">
          {FORMATS.map((f) => {
            const previewH = 560;
            const scale = previewH / f.h;
            return (
              <figure key={f.key} className="m-0 shrink-0 snap-center">
                <figcaption className="mb-2 text-sm font-medium">
                  {f.label}{" "}
                  <span className="text-muted-foreground font-normal">
                    {f.w}×{f.h}
                  </span>
                </figcaption>
                <div
                  className="relative rounded-lg overflow-hidden ring-1 ring-border shadow-sm"
                  style={{ width: f.w * scale, height: f.h * scale }}
                >
                  <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
                    <StarQuestionFrame
                      w={f.w}
                      h={f.h}
                      question={question}
                      answers={answers}
                      reveal={reveal}
                      lang={lang}
                      safeInsets={f.safeInsets}
                    />
                  </div>
                  {/* Preview-only guides for the platform chrome; never part
                      of the frame itself, so screenshots stay clean. */}
                  {showSafeZones && f.safeInsets && (
                    <div className="absolute inset-0 pointer-events-none">
                      {f.safeInsets.top && (
                        <div
                          className="absolute top-0 left-0 right-0 bg-red-500/25 border-b border-red-400"
                          style={{ height: f.safeInsets.top * scale }}
                        />
                      )}
                      {f.safeInsets.bottom && (
                        <div
                          className="absolute bottom-0 left-0 right-0 bg-red-500/25 border-t border-red-400"
                          style={{ height: f.safeInsets.bottom * scale }}
                        />
                      )}
                      {f.safeInsets.right && (
                        <div
                          className="absolute top-0 bottom-0 right-0 bg-red-500/25 border-l border-red-400"
                          style={{ width: f.safeInsets.right * scale }}
                        />
                      )}
                      {f.safeInsets.left && (
                        <div
                          className="absolute top-0 bottom-0 left-0 bg-red-500/25 border-r border-red-400"
                          style={{ width: f.safeInsets.left * scale }}
                        />
                      )}
                    </div>
                  )}
                </div>
              </figure>
            );
          })}
        </div>
      )}
    </div>
  );
}

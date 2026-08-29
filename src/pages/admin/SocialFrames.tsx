import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { Shuffle, Eye, EyeOff, BookmarkPlus, ListTodo } from "lucide-react";
import { seededShuffle, type Question } from "@/components/social/QotdFrame";
import { StarQuestionFrame } from "@/components/social/StarQuestionFrame";
import { FORMATS } from "@/components/social/frameFormats";
import { frameDrafts, defaultCaption } from "@/components/social/frameDrafts";
import { SavedFramesSheet } from "@/components/social/SavedFrames";
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

/** Pool rows carry the question's icon assignment on top of QotdFrame's shape. */
type PoolQuestion = Question & { icon_slug?: string | null };

export default function SocialFrames() {
  const { user } = useAuth();
  const [lang, setLang] = useState<string>("ka");
  const [pool, setPool] = useState<PoolQuestion[]>([]);
  const [savedRefresh, setSavedRefresh] = useState(0);
  const [queueOpen, setQueueOpen] = useState(false);
  // categories.id (uuid) → categories.category_id (ascii key the icon
  // library understands), for the icon fallback chain.
  const [categoryKeys, setCategoryKeys] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPool = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Text questions only. Media questions carry a generic stem ("What is
      // it?", "რა არის ეს?") because the picture IS the question — and this
      // frame doesn't render the picture, so they read as one hardcoded
      // title on every shuffle.
      const { data, error: err } = await supabase
        .from("questions")
        .select(
          "id, question_text, correct_answer, incorrect_answers, difficulty, category_id, icon_slug",
        )
        .eq("language", lang)
        .eq("is_active", true)
        .eq("in_production", true)
        .is("image_url", null)
        .is("video_url", null)
        .is("audio_url", null)
        .limit(300);
      if (err) throw err;
      // Keep only questions that fit the frames: answers render at one fixed
      // size and ellipsize past ~22 chars, and a title over ~90 chars would
      // need shrinking below what reads well on the narrow 9:16 canvases.
      // Filtered here because PostgREST can't filter on text length.
      const fitsFrame = (q: PoolQuestion) => {
        if (q.question_text.length > 90) return false;
        const incorrect = Array.isArray(q.incorrect_answers)
          ? (q.incorrect_answers as string[])
          : [];
        return [q.correct_answer, ...incorrect].every(
          (a) => typeof a === "string" && a.length <= 22,
        );
      };
      const rows = ((data ?? []) as PoolQuestion[]).filter(fitsFrame).slice(0, 60);
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

  useEffect(() => {
    supabase
      .from("categories")
      .select("id, category_id")
      .then(({ data }) => {
        const map: Record<string, string> = {};
        for (const row of data ?? []) map[row.id] = row.category_id;
        setCategoryKeys(map);
      });
  }, []);

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

  /** Persist the current question + this canvas as a saved frame. */
  const saveFrame = async (formatKey: string) => {
    const f = FORMATS.find((x) => x.key === formatKey);
    if (!question || !f) return;
    try {
      await frameDrafts.insert({
        language: lang,
        format_key: f.key,
        w: f.w,
        h: f.h,
        reveal,
        question_id: question.id,
        payload: {
          id: question.id,
          question_text: question.question_text,
          correct_answer: question.correct_answer,
          icon_slug: question.icon_slug,
          answers,
          category_key: categoryKeys[question.category_id],
        },
        caption: defaultCaption(question.question_text),
        platforms: ["instagram"],
        created_by: user?.id ?? null,
      });
      setSavedRefresh((n) => n + 1);
      setQueueOpen(true);
      toast.success(`Saved ${f.label} to the queue`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
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
        <Button variant="outline" size="sm" onClick={() => setQueueOpen(true)}>
          <ListTodo className="w-4 h-4 mr-2" />
          Queue
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
                <figcaption className="mb-2 text-sm font-medium flex items-center gap-2">
                  <span>
                    {f.label}{" "}
                    <span className="text-muted-foreground font-normal">
                      {f.w}×{f.h}
                    </span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-7 px-2"
                    onClick={() => saveFrame(f.key)}
                  >
                    <BookmarkPlus className="w-4 h-4 mr-1" />
                    Save frame
                  </Button>
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
                      categoryKey={categoryKeys[question.category_id]}
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

      <SavedFramesSheet open={queueOpen} onOpenChange={setQueueOpen} refreshToken={savedRefresh} />
    </div>
  );
}

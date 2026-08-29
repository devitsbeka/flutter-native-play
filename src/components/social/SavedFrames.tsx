import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, CalendarClock, Trash2, ExternalLink } from "lucide-react";
import { frameDrafts, type FrameDraft } from "@/components/social/frameDrafts";
import { formatByKey } from "@/components/social/frameFormats";
import { renderDraftToPng } from "@/components/social/renderFrameDraft";

/**
 * Saved frames: the persisted drafts under the carousel. Each row can be
 * posted now or scheduled; the browser renders the exact frame to PNG and
 * the social-post edge function (which holds the Late key) does the rest.
 */

const STATUS_STYLES: Record<FrameDraft["status"], string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-amber-500/15 text-amber-600",
  posted: "bg-emerald-500/15 text-emerald-600",
  failed: "bg-destructive/15 text-destructive",
};

const POSTABLE_PLATFORMS = ["instagram", "facebook"] as const;

export function SavedFrames({ refreshToken }: { refreshToken: number }) {
  const [drafts, setDrafts] = useState<FrameDraft[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [scheduleAt, setScheduleAt] = useState<Record<string, string>>({});

  const reload = useCallback(async () => {
    try {
      setDrafts(await frameDrafts.list());
      setLoadError(null);
    } catch (e) {
      // The clearest failure is the migration not being applied yet.
      setLoadError(e instanceof Error ? e.message : "Failed to load saved frames");
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload, refreshToken]);

  const submit = useCallback(
    async (draft: FrameDraft, scheduledFor?: string) => {
      setBusyId(draft.id);
      setNotice(null);
      try {
        const imageBase64 = await renderDraftToPng(draft);
        const { data, error } = await supabase.functions.invoke("social-post", {
          body: {
            draftId: draft.id,
            imageBase64,
            caption: draft.caption,
            platforms: draft.platforms,
            altText: draft.payload.question_text,
            ...(scheduledFor ? { scheduledFor } : {}),
          },
        });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
        setNotice(
          scheduledFor
            ? `Scheduled for ${new Date(scheduledFor).toLocaleString()}`
            : "Posted ✔",
        );
      } catch (e) {
        setNotice(e instanceof Error ? e.message : "Posting failed");
      } finally {
        setBusyId(null);
        reload();
      }
    },
    [reload],
  );

  if (loadError) {
    return (
      <p className="text-sm text-destructive">
        Saved frames unavailable: {loadError}. If the social_frame_drafts migration hasn&apos;t
        been applied yet, run it in the Lovable SQL editor first.
      </p>
    );
  }
  if (drafts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No saved frames yet — pick a question, then use “Save frame” on a canvas above.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {notice && <p className="text-sm font-medium">{notice}</p>}
      {drafts.map((d) => {
        const busy = busyId === d.id;
        const fmt = formatByKey(d.format_key);
        return (
          <div key={d.id} className="rounded-lg border p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[d.status]}`}>
                {d.status}
              </span>
              <span className="text-sm font-medium">{fmt?.label ?? d.format_key}</span>
              <span className="text-xs text-muted-foreground uppercase">{d.language}</span>
              <span className="text-sm truncate max-w-md">{d.payload.question_text}</span>
              {d.reveal && <span className="text-xs text-muted-foreground">answer revealed</span>}
              {d.status === "scheduled" && d.scheduled_for && (
                <span className="text-xs text-muted-foreground">
                  → {new Date(d.scheduled_for).toLocaleString()}
                </span>
              )}
              {d.platform_post_url && (
                <a
                  href={d.platform_post_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary inline-flex items-center gap-1"
                >
                  view post <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-destructive"
                disabled={busy}
                onClick={async () => {
                  await frameDrafts.remove(d.id);
                  reload();
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            {d.last_error && d.status === "failed" && (
              <p className="text-xs text-destructive">{d.last_error}</p>
            )}

            <Textarea
              defaultValue={d.caption}
              rows={3}
              className="text-sm"
              onBlur={(e) => {
                if (e.target.value !== d.caption) {
                  frameDrafts.update(d.id, { caption: e.target.value }).then(reload);
                }
              }}
            />

            <div className="flex flex-wrap items-center gap-3">
              {POSTABLE_PLATFORMS.map((p) => (
                <label key={p} className="flex items-center gap-1.5 text-sm capitalize">
                  <input
                    type="checkbox"
                    checked={d.platforms.includes(p)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...d.platforms, p]
                        : d.platforms.filter((x) => x !== p);
                      frameDrafts.update(d.id, { platforms: next }).then(reload);
                    }}
                  />
                  {p}
                </label>
              ))}

              <div className="flex items-center gap-2 ml-auto">
                <input
                  type="datetime-local"
                  className="border rounded-md px-2 py-1.5 text-sm bg-background"
                  value={scheduleAt[d.id] ?? ""}
                  onChange={(e) => setScheduleAt((s) => ({ ...s, [d.id]: e.target.value }))}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy || !scheduleAt[d.id] || d.platforms.length === 0}
                  onClick={() => submit(d, new Date(scheduleAt[d.id]).toISOString())}
                >
                  {busy ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CalendarClock className="w-4 h-4 mr-2" />
                  )}
                  Schedule
                </Button>
                <Button
                  size="sm"
                  disabled={busy || d.platforms.length === 0}
                  onClick={() => submit(d)}
                >
                  {busy ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Post now
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

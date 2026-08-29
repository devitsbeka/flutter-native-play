import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "@/lib/toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Send, CalendarClock, Trash2, ExternalLink } from "lucide-react";
import { frameDrafts, type FrameDraft } from "@/components/social/frameDrafts";
import { formatByKey } from "@/components/social/frameFormats";
import { renderDraftToPng } from "@/components/social/renderFrameDraft";

/**
 * The posting queue — saved frames in a right-side sheet. Saving a frame
 * opens it; each entry can be posted now or scheduled, with the two slow
 * phases (rendering the PNG in the browser, then the edge function talking
 * to Late) surfaced as visible stages so a 10–20s publish never looks hung.
 */

const STATUS_STYLES: Record<FrameDraft["status"], string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-amber-500/15 text-amber-600",
  posted: "bg-emerald-500/15 text-emerald-600",
  failed: "bg-destructive/15 text-destructive",
};

/** Queue order: what's about to go out first, done work last. */
const STATUS_ORDER: Record<FrameDraft["status"], number> = {
  scheduled: 0,
  draft: 1,
  failed: 2,
  posted: 3,
};

const POSTABLE_PLATFORMS = ["instagram", "facebook"] as const;

type Phase = "rendering" | "publishing";

export function SavedFramesSheet({
  open,
  onOpenChange,
  refreshToken,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  refreshToken: number;
}) {
  const [drafts, setDrafts] = useState<FrameDraft[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<{ id: string; phase: Phase } | null>(null);
  const [scheduleAt, setScheduleAt] = useState<Record<string, string>>({});
  // Inline outcome line: app toasts are delivery-suppressed (see lib/toast),
  // so the sheet reports results itself.
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const reload = useCallback(async () => {
    try {
      setDrafts(await frameDrafts.list());
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load saved frames");
    }
  }, []);

  useEffect(() => {
    if (open) reload();
  }, [open, reload, refreshToken]);

  // Posted work lives in its own tab; everything still in flight is the queue.
  const queue = useMemo(
    () =>
      drafts
        .filter((d) => d.status !== "posted")
        .sort((a, b) => {
          const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
          if (byStatus !== 0) return byStatus;
          if (a.status === "scheduled" && a.scheduled_for && b.scheduled_for) {
            return a.scheduled_for.localeCompare(b.scheduled_for);
          }
          return b.created_at.localeCompare(a.created_at);
        }),
    [drafts],
  );

  const posted = useMemo(
    () =>
      drafts
        .filter((d) => d.status === "posted")
        .sort((a, b) => (b.posted_at ?? "").localeCompare(a.posted_at ?? "")),
    [drafts],
  );

  const submit = useCallback(
    async (draft: FrameDraft, scheduledFor?: string) => {
      setBusy({ id: draft.id, phase: "rendering" });
      setNotice(null);
      try {
        const imageBase64 = await renderDraftToPng(draft);
        setBusy({ id: draft.id, phase: "publishing" });
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
        const text = scheduledFor
          ? `Scheduled for ${new Date(scheduledFor).toLocaleString()}`
          : "Posted to " + draft.platforms.join(" + ") + " ✔";
        setNotice({ ok: true, text });
        toast.success(text);
      } catch (e) {
        const text = e instanceof Error ? e.message : "Posting failed";
        setNotice({ ok: false, text });
        toast.error(text);
      } finally {
        setBusy(null);
        reload();
      }
    },
    [reload],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Posting queue</SheetTitle>
        </SheetHeader>

        {loadError && (
          <p className="mt-4 text-sm text-destructive">
            Saved frames unavailable: {loadError}. If the social_frame_drafts migration
            hasn&apos;t been applied yet, run it in the Lovable SQL editor first.
          </p>
        )}
        {notice && (
          <p
            className={`mt-4 text-sm font-medium ${notice.ok ? "text-emerald-600" : "text-destructive"}`}
          >
            {notice.text}
          </p>
        )}

        <Tabs defaultValue="queue" className="mt-4">
          <TabsList>
            <TabsTrigger value="queue">Queue ({queue.length})</TabsTrigger>
            <TabsTrigger value="posted">Posted ({posted.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="posted" className="space-y-3">
            {posted.length === 0 && (
              <p className="text-sm text-muted-foreground">Nothing posted yet.</p>
            )}
            {posted.map((d) => (
              <div key={d.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES.posted}`}
                  >
                    posted
                  </span>
                  <span className="text-sm font-medium">
                    {formatByKey(d.format_key)?.label ?? d.format_key}
                  </span>
                  <span className="text-xs text-muted-foreground uppercase">{d.language}</span>
                  {d.posted_at && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(d.posted_at).toLocaleString()}
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
                    onClick={async () => {
                      await frameDrafts.remove(d.id);
                      reload();
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">{d.payload.question_text}</p>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="queue" className="space-y-3">
            {!loadError && queue.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Queue is empty — use “Save frame” on a canvas to add one.
              </p>
            )}

            {queue.map((d) => {
            const isBusy = busy?.id === d.id;
            const anyBusy = busy !== null;
            const fmt = formatByKey(d.format_key);
            return (
              <div
                key={d.id}
                className={`relative rounded-lg border p-4 space-y-3 ${isBusy ? "opacity-90" : ""}`}
              >
                {isBusy && (
                  <div className="absolute inset-0 z-10 rounded-lg bg-background/70 backdrop-blur-[1px] flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm font-medium">
                      {busy.phase === "rendering"
                        ? "Rendering frame…"
                        : "Uploading & publishing…"}
                    </span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[d.status]}`}
                  >
                    {d.status}
                  </span>
                  <span className="text-sm font-medium">{fmt?.label ?? d.format_key}</span>
                  <span className="text-xs text-muted-foreground uppercase">{d.language}</span>
                  {d.reveal && (
                    <span className="text-xs text-muted-foreground">answer revealed</span>
                  )}
                  {d.status === "scheduled" && d.scheduled_for && (
                    <span className="text-xs font-medium text-amber-600">
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
                    disabled={anyBusy}
                    onClick={async () => {
                      await frameDrafts.remove(d.id);
                      reload();
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <p className="text-sm">{d.payload.question_text}</p>

                {d.last_error && d.status === "failed" && (
                  <p className="text-xs text-destructive">{d.last_error}</p>
                )}

                <Textarea
                  defaultValue={d.caption}
                  rows={3}
                  className="text-sm"
                  disabled={anyBusy}
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
                        disabled={anyBusy}
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
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <input
                    type="datetime-local"
                    className="border rounded-md px-2 py-1.5 text-sm bg-background"
                    value={scheduleAt[d.id] ?? ""}
                    disabled={anyBusy}
                    onChange={(e) =>
                      setScheduleAt((s) => ({ ...s, [d.id]: e.target.value }))
                    }
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={anyBusy || !scheduleAt[d.id] || d.platforms.length === 0}
                    onClick={() => submit(d, new Date(scheduleAt[d.id]).toISOString())}
                  >
                    <CalendarClock className="w-4 h-4 mr-2" />
                    Schedule
                  </Button>
                  <Button
                    size="sm"
                    disabled={anyBusy || d.platforms.length === 0}
                    onClick={() => submit(d)}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Post now
                  </Button>
                </div>
              </div>
            );
          })}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

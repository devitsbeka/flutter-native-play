import { useState } from "react";
import { Flag } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { ReportBlockSheet, type ReportedContentType } from "@/components/social/ReportBlockSheet";
import { cn } from "@/lib/utils";

/** user_reports.content_id is a uuid; the sample feed's post ids are not. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ContentReportButtonProps {
  /** What is being reported. */
  contentType: ReportedContentType;
  /** Its id — a `user_quiz_posts.id` or a `game_rooms.id`. */
  contentId: string;
  /**
   * Who posted it, when the caller already knows. When it is not passed this
   * looks the author up on the first tap, so a report always names a person:
   * `user_reports.reported_user_id` is NOT NULL, and a report filed against
   * nobody cannot be acted on.
   */
  authorUserId?: string | null;
  /** Recorded alongside, when the content lives in a room. */
  roomId?: string;
  className?: string;
  /** Show the word "Report" next to the flag; icon-only otherwise. */
  withLabel?: boolean;
}

/**
 * "Report" on a quiz or a room.
 *
 * Guideline 1.2 asks for a report affordance on the CONTENT, and until now
 * the only one in the app hung off a player's profile — you had to work out
 * who had posted the thing that offended you, open them, and use the three
 * dots. The two other mount points were inside the Explore feed, which is not
 * reachable from the shipped navigation. So a reviewer playing a shared quiz
 * or sitting in a public room had nothing to tap.
 *
 * The sheet it opens is the same one the profile menu opens, with the same
 * reasons and the same free-text note; what is different is that the report
 * carries `content_type`/`content_id`, which is what lets an admin unpublish
 * the actual quiz rather than only mark the report reviewed.
 *
 * Renders nothing for a signed-out reader (no account to report from) and
 * nothing on your own content.
 */
export function ContentReportButton({
  contentType,
  contentId,
  authorUserId,
  roomId,
  className,
  withLabel = false,
}: ContentReportButtonProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [author, setAuthor] = useState<string | null>(authorUserId ?? null);
  const [busy, setBusy] = useState(false);

  if (!user) return null;
  if ((authorUserId ?? author) === user.id) return null;

  const resolveAuthor = async (): Promise<string | null> => {
    if (author) return author;
    if (!UUID.test(contentId)) return null;
    try {
      if (contentType === "quiz") {
        const { data } = await supabase
          .from("user_quiz_posts")
          .select("user_id")
          .eq("id", contentId)
          .maybeSingle();
        return data?.user_id ?? null;
      }
      if (contentType === "room") {
        const { data } = await supabase
          .from("game_rooms")
          .select("host_user_id")
          .eq("id", contentId)
          .maybeSingle();
        return data?.host_user_id ?? null;
      }
    } catch (e) {
      // A report with no author named is still a report — the row falls back
      // to the reporter, and content_id says what it is about.
      console.warn("[moderation] Could not resolve content author", e);
    }
    return null;
  };

  const openSheet = async () => {
    if (busy) return;
    setBusy(true);
    const found = await resolveAuthor();
    if (found) setAuthor(found);
    setBusy(false);
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        aria-label={t("moderation.report")}
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation();
          void openSheet();
        }}
        className={cn(
          "flex items-center justify-center gap-1.5 rounded-full text-muted-foreground",
          "transition active:scale-95 hover:bg-muted disabled:opacity-50",
          withLabel ? "px-3 py-2 text-sm font-semibold" : "h-9 w-9",
          className,
        )}
      >
        <Flag className="h-4 w-4" />
        {withLabel && t("moderation.report")}
      </button>

      <ReportBlockSheet
        open={open}
        view="reasons"
        onClose={() => setOpen(false)}
        userId={author ?? ""}
        context={{ contentType, contentId, roomId }}
      />
    </>
  );
}

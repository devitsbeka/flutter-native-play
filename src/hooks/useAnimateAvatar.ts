import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { t } from "@/lib/i18n";

/**
 * Turn a still avatar or scene into a looping video.
 *
 * `animate-avatar` is a two-call protocol, not a request: the first call
 * starts a Kling job and hands back `{ requestId, statusUrl, responseUrl }`,
 * and the same function is called again with those until it answers with a
 * video. It takes minutes, so the caller is expected to walk away — the shell
 * shows a floating bubble and the result applies itself.
 *
 * This lived inline in AvatarModal, which is why animating was reachable from
 * exactly one screen: the protocol, the eight-minute budget and the failure
 * handling were all written into a component nobody else could mount. Both
 * modes go through here now.
 *
 *   - `scene` writes the loop onto the scene's `avatar_generations` row and
 *     the homepage picks it up.
 *   - `avatar` writes `profiles.animated_avatar_url` — the animated circle.
 *
 * Which of those happens is the edge function's business; nothing here
 * decides it, so the client cannot disagree with what was actually written.
 */

/** Kling takes a few minutes: poll every 5 seconds for up to 8. */
const POLL_INTERVAL_MS = 5000;
const MAX_ATTEMPTS = 96;
/** Say something every half minute so a long wait does not look like a stall. */
const PROGRESS_EVERY = 6;

export interface AnimateRequest {
  mode: "scene" | "avatar";
  /** The still being animated. For a scene this also names the row to update. */
  imageUrl: string;
  userId: string;
  promptOverride?: string;
  /** Progress toasts are wanted on the screen that started it, not on a
      background run the player has already walked away from. */
  quiet?: boolean;
}

export function useAnimateAvatar() {
  const [animating, setAnimating] = useState(false);

  /** Resolves to the video URL, or null if it failed or ran out of time. */
  const animate = useCallback(async (req: AnimateRequest): Promise<string | null> => {
    const { mode, imageUrl, userId, promptOverride, quiet } = req;
    setAnimating(true);

    try {
      if (!quiet) toast.info(t("avatar.startingAnimation"), { duration: 5000 });

      const { data, error } = await supabase.functions.invoke("animate-avatar", {
        body: { mode, imageUrl, userId, promptOverride },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Failed to start animation");

      const { requestId, statusUrl, responseUrl } = data;
      if (!requestId || !statusUrl || !responseUrl) {
        throw new Error("No request ID or URLs received");
      }

      if (!quiet) toast.info(t("avatar.animationStarted"), { duration: 3000 });

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

        const { data: status, error: statusError } = await supabase.functions.invoke(
          "animate-avatar",
          { body: { mode, imageUrl, userId, requestId, statusUrl, responseUrl } },
        );

        // A single failed poll is not a failed job — the next one may well
        // answer. Only running out of attempts is terminal.
        if (statusError) {
          console.error("Status check error:", statusError);
          continue;
        }

        if (status?.success && status?.videoUrl) {
          return status.videoUrl as string;
        }

        if (!quiet && (attempt + 1) % PROGRESS_EVERY === 0) {
          toast.info(
            t("avatar.stillProcessing", {
              time: Math.round(((attempt + 1) * POLL_INTERVAL_MS) / 60000),
            }),
            { duration: 2000 },
          );
        }
      }

      toast.error(t("avatar.animationTakingLong"));
      return null;
    } catch (error) {
      console.error("Error animating:", error);
      toast.error(error instanceof Error ? error.message : "Failed to animate");
      return null;
    } finally {
      setAnimating(false);
    }
  }, []);

  return { animate, animating };
}

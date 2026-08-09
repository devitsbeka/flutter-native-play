import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/hooks/useAdminRole";
import { SCENE_AVATAR_MODEL, SCENE_AVATAR_PROMPT } from "@/config/sceneAvatarPrompt";

// The generate-avatar edge function reads its prompt from the
// ai_generation_settings table, which only admins can write (RLS). The deploy
// pipeline never touches the database, so an admin session keeps the stored
// prompt in sync with the source-controlled one: whenever an admin opens the
// app and the stored avatar_static prompt differs, it is updated in place.
export function AdminAIPromptSync() {
  const { isAdmin } = useAdminRole();
  const synced = useRef(false);

  useEffect(() => {
    if (!isAdmin || synced.current) return;
    synced.current = true;

    (async () => {
      try {
        const { data: settings, error: readError } = await supabase
          .from("ai_generation_settings")
          .select("id, prompt, model")
          .eq("setting_type", "avatar_static")
          .maybeSingle();

        if (readError) {
          console.error("[AdminAIPromptSync] Could not read settings row:", readError);
          return;
        }

        if (settings?.prompt === SCENE_AVATAR_PROMPT && settings?.model === SCENE_AVATAR_MODEL) {
          console.log("[AdminAIPromptSync] Scene prompt already up to date");
          return;
        }

        // The row may not exist yet (fresh project / renamed setting_type).
        // Bailing there used to leave generation on the stale built-in prompt
        // forever, so create it instead of returning.
        const { error } = settings
          ? await supabase
              .from("ai_generation_settings")
              .update({ prompt: SCENE_AVATAR_PROMPT, model: SCENE_AVATAR_MODEL })
              .eq("id", settings.id)
          : await supabase
              .from("ai_generation_settings")
              .insert({
                // name is NOT NULL in the table — omitting it failed typecheck
                // and would have been rejected by the database at runtime
                name: "Scene avatar",
                setting_type: "avatar_static",
                prompt: SCENE_AVATAR_PROMPT,
                model: SCENE_AVATAR_MODEL,
                is_active: true,
              });

        if (error) {
          console.error("[AdminAIPromptSync] Failed to sync scene prompt:", error);
        } else {
          console.log(
            `[AdminAIPromptSync] Scene avatar prompt ${settings ? "updated" : "created"} (${SCENE_AVATAR_PROMPT.length} chars)`
          );
        }
      } catch (e) {
        console.error("[AdminAIPromptSync] Sync error:", e);
      }
    })();
  }, [isAdmin]);

  return null;
}

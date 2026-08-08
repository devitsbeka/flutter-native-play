import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/hooks/useAdminRole";
import { SCENE_AVATAR_PROMPT } from "@/config/sceneAvatarPrompt";

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
        const { data: settings } = await supabase
          .from("ai_generation_settings")
          .select("id, prompt")
          .eq("setting_type", "avatar_static")
          .maybeSingle();

        if (!settings) return;
        if (settings.prompt === SCENE_AVATAR_PROMPT) return;

        const { error } = await supabase
          .from("ai_generation_settings")
          .update({ prompt: SCENE_AVATAR_PROMPT })
          .eq("id", settings.id);

        if (error) {
          console.error("[AdminAIPromptSync] Failed to sync scene prompt:", error);
        } else {
          console.log("[AdminAIPromptSync] Scene avatar prompt synced");
        }
      } catch (e) {
        console.error("[AdminAIPromptSync] Sync error:", e);
      }
    })();
  }, [isAdmin]);

  return null;
}

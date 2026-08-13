import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Ban, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useContentModeration } from "@/hooks/useContentModeration";
import { SafeAvatar } from "@/components/shared/SafeAvatar";
import { useLanguage } from "@/contexts/LanguageContext";

interface BlockedPlayer {
  user_id: string;
  nickname: string | null;
  avatar_url: string | null;
}

/**
 * The list of people you've blocked, and the way back.
 *
 * Blocking without an undo is a trap, and Apple's review of Guideline 1.2
 * looks for the management surface as well as the action itself. Lives in
 * Settings → Privacy, next to the other things you'd go looking for here.
 *
 * Renders nothing at all when the list is empty, so it doesn't add furniture
 * to the settings page for the overwhelming majority who never block anyone.
 */
export function BlockedPlayersSection() {
  const { t } = useLanguage();
  const { blockedIds, unblockUser, loading } = useContentModeration();
  const [players, setPlayers] = useState<BlockedPlayer[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const ids = [...blockedIds];
    if (ids.length === 0) {
      setPlayers([]);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, nickname, avatar_url")
        .in("user_id", ids);

      if (error) {
        console.error("[moderation] Could not load blocked profiles:", error);
        return;
      }
      if (!cancelled) setPlayers(data ?? []);
    })();

    return () => { cancelled = true; };
  }, [blockedIds]);

  if (loading || players.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="space-y-3"
    >
      <h2 className="text-lg font-display font-bold text-foreground">
        {t("moderation.blockedPlayers")}
      </h2>

      {players.map((player) => (
        <div
          key={player.user_id}
          className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border"
        >
          <SafeAvatar
            avatarUrl={player.avatar_url}
            fallback={player.nickname ?? "?"}
            className="w-10 h-10 border border-border"
            fallbackClassName="bg-muted text-sm"
          />
          <span className="flex-1 font-medium text-foreground">
            {player.nickname ?? t("moderation.thisPlayer")}
          </span>
          <button
            disabled={busyId === player.user_id}
            onClick={async () => {
              setBusyId(player.user_id);
              await unblockUser(player.user_id);
              setBusyId(null);
            }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            {busyId === player.user_id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Ban className="w-4 h-4" />
            )}
            {t("moderation.unblock")}
          </button>
        </div>
      ))}
    </motion.div>
  );
}

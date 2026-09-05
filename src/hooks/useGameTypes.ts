import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  GAME_TYPES,
  applyDeveloperMode,
  type GameTypeDescriptor,
} from "@/game-types/registry";
import { useDeveloperMode } from "@/contexts/DeveloperModeContext";

type GameTypeRow = {
  key: string;
  is_live: boolean;
  badge: string | null;
  sort_order: number;
  supports_matchmaking: boolean;
};

// Renders the /play chooser from the static registry, letting the database's
// `game_types` table override liveness, badge and order once the migration is
// deployed. Until then (or offline) the query fails or returns nothing and the
// static registry stands on its own — the page must never be empty because of
// a fetch.
//
// DB → status mapping: is_live → "live"; not live but badged → "coming_soon"
// (a teaser card); not live and unbadged → "hidden".
//
// Developer-only modes (registry: DEVELOPER_ONLY_GAME_TYPES) are applied on
// top of all that: gone for everyone, live for an admin with developer mode
// on. The DB row cannot release one of those — promoting it is a code change.
export function useGameTypes(): GameTypeDescriptor[] {
  const [rows, setRows] = useState<GameTypeRow[] | null>(null);
  const { developerMode } = useDeveloperMode();

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("game_types")
      .select("key, is_live, badge, sort_order, supports_matchmaking")
      .then(({ data, error }) => {
        if (!cancelled && !error && data && data.length > 0) setRows(data);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => {
    const byKey = new Map(rows?.map((r) => [r.key, r]) ?? []);
    const resolved = GAME_TYPES.map((gt) => {
      const row = byKey.get(gt.key);
      if (!row) return gt;
      return {
        ...gt,
        status: row.is_live ? "live" : row.badge ? "coming_soon" : "hidden",
        badge: row.badge === "new" || row.badge === "beta" ? row.badge : null,
        sortOrder: row.sort_order,
        supportsMatchmaking: row.supports_matchmaking,
      } satisfies GameTypeDescriptor;
    });
    return applyDeveloperMode(resolved, developerMode)
      .filter((gt) => gt.status !== "hidden")
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [rows, developerMode]);
}

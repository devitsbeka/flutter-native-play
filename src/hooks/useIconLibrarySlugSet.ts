import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Loads ALL icon slugs from icon_library (paginated) and exposes them as a lowercase Set.
 * Used to detect questions that reference an icon_slug that no longer exists.
 */
export function useIconLibrarySlugSet() {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const pageSize = 1000;
        let page = 0;
        let hasMore = true;
        const all: string[] = [];

        while (hasMore) {
          const { data, error: e } = await supabase
            .from("icon_library")
            .select("slug")
            .order("slug")
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (e) throw e;
          const batch = (data || []).map((r: any) => String(r.slug || ""));
          all.push(...batch);

          hasMore = batch.length === pageSize;
          page++;
        }

        if (!cancelled) setSlugs(all);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error("Failed to load icon slugs"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const slugSet = useMemo(() => {
    return new Set(slugs.map((s) => s.toLowerCase()));
  }, [slugs]);

  return { slugSet, loading, error, count: slugs.length };
}

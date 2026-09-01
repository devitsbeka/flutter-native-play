import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * The live promotion, from `public.promotions` — see the migration of the
 * same name. One row at most: the soonest-ending live one.
 */
export interface Promotion {
  id: string;
  /** Label by language code; English is guaranteed by the table. */
  label: Record<string, string>;
  endsAt: string;
}

export function promotionLabel(promotion: Promotion, language: string): string {
  return promotion.label[language] ?? promotion.label.en ?? Object.values(promotion.label)[0] ?? "";
}

export function usePromotion(): Promotion | null {
  const { data } = useQuery({
    queryKey: ["promotion", "live"],
    queryFn: async (): Promise<Promotion | null> => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("promotions")
        .select("id, label, ends_at")
        .eq("active", true)
        .lte("starts_at", now)
        .gt("ends_at", now)
        .order("ends_at", { ascending: true })
        .limit(1);
      if (error) {
        // Most likely the migration has not reached this database yet. The
        // strip simply stays off; nothing else on the page depends on it.
        console.warn("[promotions] not available:", error.message);
        return null;
      }
      const row = data?.[0];
      if (!row) return null;
      const label = (row.label ?? {}) as Record<string, string>;
      if (typeof label !== "object" || !label.en) return null;
      return { id: row.id, label, endsAt: row.ends_at };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: false,
  });
  return data ?? null;
}

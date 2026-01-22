import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors.ts";

type FixResult = {
  scanned: number;
  brokenFound: number;
  updatedToCategory: number;
  clearedToNull: number;
};

serve(async (req) => {
  const preflight = handleCorsPrelight(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = (await req.json().catch(() => ({}))) as { dryRun?: boolean };
    const dryRun = Boolean(body.dryRun);

    // Load icon slugs (valid)
    const valid = new Set<string>();
    {
      const pageSize = 1000;
      let page = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from("icon_library")
          .select("slug")
          .order("slug")
          .range(page * pageSize, (page + 1) * pageSize - 1);
        if (error) throw error;
        const batch = (data || []).map((r: any) => String(r.slug || "").toLowerCase());
        batch.forEach((s) => s && valid.add(s));
        hasMore = batch.length === pageSize;
        page++;
      }
    }

    // Load categories map: id -> valid category icon slug (or null)
    const categoryIcon = new Map<string, string | null>();
    {
      const { data, error } = await supabase
        .from("categories")
        .select("id, icon_slug")
        .eq("is_active", true);
      if (error) throw error;
      for (const row of data || []) {
        const slug = row.icon_slug ? String(row.icon_slug).toLowerCase() : null;
        categoryIcon.set(row.id, slug && valid.has(slug) ? slug : null);
      }
    }

    const result: FixResult = {
      scanned: 0,
      brokenFound: 0,
      updatedToCategory: 0,
      clearedToNull: 0,
    };

    // Scan questions in pages and fix broken icon_slug values
    const pageSize = 1000;
    let page = 0;
    let hasMore = true;
    while (hasMore) {
      const { data: questions, error } = await supabase
        .from("questions")
        .select("id, category_id, icon_slug")
        .eq("is_active", true)
        .not("icon_slug", "is", null)
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (error) throw error;

      const batch = questions || [];
      result.scanned += batch.length;
      hasMore = batch.length === pageSize;
      page++;

      for (const q of batch as any[]) {
        const current = q.icon_slug ? String(q.icon_slug).toLowerCase() : null;
        if (!current) continue;

        if (valid.has(current)) continue; // not broken

        result.brokenFound++;
        const fallback = categoryIcon.get(q.category_id) ?? null;

        if (dryRun) {
          if (fallback) result.updatedToCategory++;
          else result.clearedToNull++;
          continue;
        }

        const nextSlug = fallback;
        const { error: updErr } = await supabase
          .from("questions")
          .update({ icon_slug: nextSlug })
          .eq("id", q.id);

        if (updErr) {
          console.error("Failed to update question", q.id, updErr);
          continue;
        }

        if (nextSlug) result.updatedToCategory++;
        else result.clearedToNull++;
      }
    }

    return new Response(JSON.stringify({ ok: true, dryRun, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in fix-broken-icon-references:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});

import { supabase } from "@/integrations/supabase/client";

/**
 * Overlay per-language names onto raw `categories` rows.
 *
 * `categories.name` is Georgian for every row; the other languages live in
 * `category_translations`, keyed by the category UUID. Screens that list
 * categories through `useCategories` get this for free — but two room-flow
 * surfaces (CreateRoomPage, CategoryPickerModal) run their own raw fetch and
 * showed Georgian names under an English UI. They call this instead.
 *
 * Reading in Georgian needs no lookup; a failed lookup falls back to the
 * base names rather than blanking the list.
 */
export async function localizeCategoryNames<T extends { id: string; name: string }>(
  rows: T[],
): Promise<T[]> {
  let lang = "en";
  try {
    lang = localStorage.getItem("preferredLanguage") || "en";
  } catch {
    /* private mode — fall through with the default */
  }
  if (lang === "ka" || rows.length === 0) return rows;

  try {
    const { data, error } = await supabase
      .from("category_translations")
      .select("category_id, name")
      .eq("language", lang);
    if (error || !data?.length) return rows;

    const byId = new Map(data.map((r) => [r.category_id, r.name]));
    return rows.map((row) => ({ ...row, name: byId.get(row.id) || row.name }));
  } catch {
    return rows;
  }
}

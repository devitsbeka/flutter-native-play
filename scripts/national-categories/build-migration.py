#!/usr/bin/env python3
"""Build the national-categories migration: 20 locale-specific categories.

Run:  python3 scripts/national-categories/build-migration.py

Each non-Georgian, non-English app locale (de/es/fr/it/pt) gets its own
History, Cuisine, Culture and Literature — the same treatment Georgian has
had from the start. The rows use the mechanism built for the Georgian set:
is_language_specific = true plus a language, which useCategories only shows
when the app language matches. Georgian keeps its existing categories; the
English locale deliberately gets none (its audience is global — it already
has the World categories).

Question banks are generated separately, in-language, by the
generate-national-questions edge function; rows here start with
total_levels = 1 and the count trigger takes over as questions land.

Ids are uuid5 of the slug, so re-running mints the same ids and the
ON CONFLICT DO NOTHING inserts make a second apply a no-op.
"""

import pathlib
import uuid

HERE = pathlib.Path(__file__).parent
OUT = HERE.parent.parent / "supabase" / "migrations" / "20260824120000_national_categories.sql"

NS = uuid.uuid5(uuid.NAMESPACE_URL, "flutter-native-play/national-categories")
LANGS = ["en", "ka", "de", "es", "fr", "it", "pt"]

NATIONS = ["german", "spanish", "french", "italian", "portuguese"]
NATION_LANG = {"german": "de", "spanish": "es", "french": "fr", "italian": "it", "portuguese": "pt"}
DOMAINS = ["history", "cuisine", "culture", "literature"]

ICONS = {"history": "🏛️", "cuisine": "🍲", "culture": "🎭", "literature": "📚"}
COLORS = {
    "history": "from-amber-400 to-orange-500",
    "cuisine": "from-red-400 to-rose-500",
    "culture": "from-purple-400 to-violet-500",
    "literature": "from-blue-400 to-indigo-500",
}
SORT_BASE = {"history": 60, "cuisine": 65, "culture": 70, "literature": 75}

# Generic adjective-form names, per display language.
ADJ = {
    "en": {"german": "German", "spanish": "Spanish", "french": "French", "italian": "Italian", "portuguese": "Portuguese"},
    "de": {"german": "Deutsche", "spanish": "Spanische", "french": "Französische", "italian": "Italienische", "portuguese": "Portugiesische"},
    "es": {"german": "alemana", "spanish": "española", "french": "francesa", "italian": "italiana", "portuguese": "portuguesa"},
    "fr": {"german": "allemande", "spanish": "espagnole", "french": "française", "italian": "italienne", "portuguese": "portugaise"},
    "it": {"german": "tedesca", "spanish": "spagnola", "french": "francese", "italian": "italiana", "portuguese": "portoghese"},
    "pt": {"german": "alemã", "spanish": "espanhola", "french": "francesa", "italian": "italiana", "portuguese": "portuguesa"},
    "ka": {"german": "გერმანიის", "spanish": "ესპანეთის", "french": "საფრანგეთის", "italian": "იტალიის", "portuguese": "პორტუგალიის"},
}
DOMAIN_WORD = {
    "en": {"history": "History", "cuisine": "Cuisine", "culture": "Culture", "literature": "Literature"},
    "de": {"history": "Geschichte", "cuisine": "Küche", "culture": "Kultur", "literature": "Literatur"},
    "es": {"history": "Historia", "cuisine": "Cocina", "culture": "Cultura", "literature": "Literatura"},
    "fr": {"history": "Histoire", "cuisine": "Cuisine", "culture": "Culture", "literature": "Littérature"},
    "it": {"history": "Storia", "cuisine": "Cucina", "culture": "Cultura", "literature": "Letteratura"},
    "pt": {"history": "História", "cuisine": "Cozinha", "culture": "Cultura", "literature": "Literatura"},
    "ka": {"history": "ისტორია", "cuisine": "სამზარეულო", "culture": "კულტურა", "literature": "ლიტერატურა"},
}

# The locale's OWN name for its OWN categories — the one its players see.
OWN_NAMES = {
    ("german", "history"): "Deutsche Geschichte",
    ("german", "cuisine"): "Deutsche Küche",
    ("german", "culture"): "Deutsche Kultur",
    ("german", "literature"): "Deutsche Literatur",
    ("spanish", "history"): "Historia de España",
    ("spanish", "cuisine"): "Cocina española",
    ("spanish", "culture"): "Cultura española",
    ("spanish", "literature"): "Literatura española",
    ("french", "history"): "Histoire de France",
    ("french", "cuisine"): "Cuisine française",
    ("french", "culture"): "Culture française",
    ("french", "literature"): "Littérature française",
    ("italian", "history"): "Storia d'Italia",
    ("italian", "cuisine"): "Cucina italiana",
    ("italian", "culture"): "Cultura italiana",
    ("italian", "literature"): "Letteratura italiana",
    ("portuguese", "history"): "História Portuguesa",
    ("portuguese", "cuisine"): "Cozinha Portuguesa",
    ("portuguese", "culture"): "Cultura Portuguesa",
    ("portuguese", "literature"): "Literatura Portuguesa",
}


def name_for(display_lang: str, nation: str, domain: str) -> str:
    if display_lang == NATION_LANG[nation]:
        return OWN_NAMES[(nation, domain)]
    adj = ADJ[display_lang][nation]
    word = DOMAIN_WORD[display_lang][domain]
    if display_lang in ("en", "de"):
        return f"{adj} {word}"  # adjective first
    if display_lang == "ka":
        return f"{adj} {word}"  # genitive first
    return f"{word} {adj}"  # romance: noun first


def sq(text: str) -> str:
    return "'" + text.replace("'", "''") + "'"


def main() -> None:
    lines = []
    lines.append("-- National categories for the non-Georgian locales: History, Cuisine,")
    lines.append("-- Culture and Literature per language, the same treatment Georgian has.")
    lines.append("--")
    lines.append("-- Generated by scripts/national-categories/build-migration.py.")
    lines.append("-- Regenerate rather than editing by hand. Idempotent: uuid5 ids and")
    lines.append("-- ON CONFLICT DO NOTHING throughout.")
    lines.append("")
    lines.append("BEGIN;")
    lines.append("")

    for nation in NATIONS:
        lang = NATION_LANG[nation]
        for domain in DOMAINS:
            slug = f"{nation}_{domain}"
            cat_id = uuid.uuid5(NS, f"category/{slug}")
            own_name = OWN_NAMES[(nation, domain)]
            lines.append(f"-- ══ {slug} ({lang}) ══")
            lines.append(
                "INSERT INTO public.categories (id, category_id, name, icon, color, type, is_active, total_levels, sort_order, language, is_language_specific)"
            )
            lines.append(
                f"VALUES ('{cat_id}', {sq(slug)}, {sq(own_name)}, {sq(ICONS[domain])}, {sq(COLORS[domain])}, "
                f"'classic', true, 1, {SORT_BASE[domain]}, {sq(lang)}, true)"
            )
            lines.append("ON CONFLICT (category_id) DO NOTHING;")
            lines.append("INSERT INTO public.category_translations (category_id, language, name) VALUES")
            rows = [
                f"  ('{cat_id}', {sq(dl)}, {sq(name_for(dl, nation, domain))})" for dl in LANGS
            ]
            lines.append(",\n".join(rows))
            lines.append("ON CONFLICT (category_id, language) DO NOTHING;")
            lines.append("")

    lines.append("-- Progress counter for the generation run. Counts only — safe for anon,")
    lines.append("-- which is what lets the coordinating session watch the run complete.")
    lines.append("CREATE OR REPLACE FUNCTION public.national_question_progress()")
    lines.append("RETURNS TABLE(category_slug text, lang text, total bigint, live bigint)")
    lines.append("LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$")
    lines.append("  SELECT c.category_id, c.language, count(q.id),")
    lines.append("         count(q.id) FILTER (WHERE q.in_production)")
    lines.append("  FROM categories c")
    lines.append("  LEFT JOIN questions q ON q.category_id = c.id AND q.is_active")
    lines.append("  WHERE c.is_language_specific AND c.language <> 'ka'")
    lines.append("  GROUP BY c.category_id, c.language ORDER BY c.category_id;")
    lines.append("$$;")
    lines.append("REVOKE ALL ON FUNCTION public.national_question_progress() FROM PUBLIC;")
    lines.append("GRANT EXECUTE ON FUNCTION public.national_question_progress() TO anon, authenticated, service_role;")
    lines.append("")
    lines.append("COMMIT;")
    lines.append("")
    OUT.write_text("\n".join(lines))
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()

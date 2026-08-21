#!/usr/bin/env python3
"""Build the popular picture-guess categories migration from the six specs.

Run:  python3 scripts/popular-image-categories/build-migration.py

Reads spec/<slug>.json (guess_celebrity, guess_movie, guess_city,
guess_sportsman, guess_logo, guess_flag) and writes one migration that
inserts:

  * six rows in `categories` (uuid5 ids, so re-running mints the same ids)
  * `category_translations` for all seven app languages
  * one `questions` row per subject per language — 70 x 7 per category —
    with the non-English rows carrying translated_from -> the English row,
    which is what keeps the translate-questions cron from re-translating
    (and re-billing) content that already ships translated.

Every subject is re-validated here even though the authoring pass already
checked it: the 70/20 gameplay limits (src/constants/questionQuality.ts),
distinct options, a Wikimedia-hosted image, and a free license. A subject
that fails any check fails the build — nothing is silently dropped.

Levels: subjects sort easy -> medium -> hard and fill levels of ten, so a
category's early levels are its easy pictures. total_levels on the category
row is derived from the actual count.
"""

import json
import pathlib
import re
import sys
import uuid

HERE = pathlib.Path(__file__).parent
SPECS = HERE / "spec"
OUT = HERE.parent.parent / "supabase" / "migrations" / "20260821120000_popular_image_categories.sql"

MAX_QUESTION = 70
MAX_ANSWER = 20
PER_LEVEL = 10

NS = uuid.uuid5(uuid.NAMESPACE_URL, "flutter-native-play/popular-image-categories")

LANGS = ["en", "ka", "de", "es", "fr", "it", "pt"]

# Licenses we ship. NC/ND and fair-use never appear here by design.
LICENSE_OK = re.compile(
    r"^(public domain|pd\b|cc0|cc[ -]by(?:[ -]sa)?[ -]?\d?\.?\d?.*)$", re.IGNORECASE
)

CATEGORIES = {
    "guess_celebrity": {
        "icon": "🌟",
        "color": "from-emerald-300 to-green-400",
        "names": {
            "ka": "გამოიცანი ვარსკვლავი", "en": "Guess the Celebrity",
            "de": "Errate den Star", "es": "Adivina la estrella",
            "fr": "Devine la star", "it": "Indovina la star",
            "pt": "Adivinhe a estrela",
        },
        "stems": {
            "en": "Which celebrity is pictured?",
            "ka": "რომელი ვარსკვლავია გამოსახული?",
            "de": "Welcher Star ist auf dem Bild?",
            "es": "¿Qué celebridad aparece en la foto?",
            "fr": "Quelle star est sur la photo ?",
            "it": "Quale star è nella foto?",
            "pt": "Que celebridade aparece na foto?",
        },
    },
    "guess_movie": {
        "icon": "🎬",
        "color": "from-pink-300 to-rose-400",
        "names": {
            "ka": "გამოიცანი ფილმი", "en": "Guess the Movie",
            "de": "Errate den Film", "es": "Adivina la película",
            "fr": "Devine le film", "it": "Indovina il film",
            "pt": "Adivinhe o filme",
        },
        "stems": {
            "en": "Which movie is this?",
            "ka": "რომელი ფილმია გამოსახული?",
            "de": "Welcher Film ist das?",
            "es": "¿Qué película es esta?",
            "fr": "Quel film est-ce ?",
            "it": "Che film è questo?",
            "pt": "Que filme é este?",
        },
    },
    "guess_city": {
        "icon": "🏙️",
        "color": "from-violet-300 to-purple-400",
        "names": {
            "ka": "გამოიცანი ქალაქი", "en": "Guess the City",
            "de": "Errate die Stadt", "es": "Adivina la ciudad",
            "fr": "Devine la ville", "it": "Indovina la città",
            "pt": "Adivinhe a cidade",
        },
        "stems": {
            "en": "Which city is pictured?",
            "ka": "რომელი ქალაქია გამოსახული?",
            "de": "Welche Stadt ist auf dem Bild?",
            "es": "¿Qué ciudad aparece en la foto?",
            "fr": "Quelle ville est sur la photo ?",
            "it": "Quale città è nella foto?",
            "pt": "Que cidade aparece na foto?",
        },
    },
    "guess_sportsman": {
        "icon": "⚽",
        "color": "from-orange-300 to-amber-400",
        "names": {
            "ka": "გამოიცანი სპორტსმენი", "en": "Guess the Athlete",
            "de": "Errate den Sportler", "es": "Adivina el deportista",
            "fr": "Devine l'athlète", "it": "Indovina l'atleta",
            "pt": "Adivinhe o atleta",
        },
        "stems": {
            "en": "Which athlete is pictured?",
            "ka": "რომელი სპორტსმენია გამოსახული?",
            "de": "Welcher Sportler ist auf dem Bild?",
            "es": "¿Qué deportista aparece en la foto?",
            "fr": "Quel athlète est sur la photo ?",
            "it": "Quale atleta è nella foto?",
            "pt": "Que atleta aparece na foto?",
        },
    },
    "guess_logo": {
        "icon": "💥",
        "color": "from-yellow-300 to-amber-400",
        "names": {
            "ka": "გამოიცანი ლოგო", "en": "Guess the Logo",
            "de": "Errate das Logo", "es": "Adivina el logo",
            "fr": "Devine le logo", "it": "Indovina il logo",
            "pt": "Adivinhe o logo",
        },
        "stems": {
            "en": "Which brand's logo is this?",
            "ka": "რომელი ბრენდის ლოგოა?",
            "de": "Zu welcher Marke gehört dieses Logo?",
            "es": "¿De qué marca es este logo?",
            "fr": "À quelle marque est ce logo ?",
            "it": "Di quale marca è questo logo?",
            "pt": "De que marca é este logo?",
        },
    },
    "guess_flag": {
        "icon": "🏁",
        "color": "from-sky-300 to-blue-400",
        "names": {
            "ka": "გამოიცანი დროშა", "en": "Guess the Flag",
            "de": "Errate die Flagge", "es": "Adivina la bandera",
            "fr": "Devine le drapeau", "it": "Indovina la bandiera",
            "pt": "Adivinhe a bandeira",
        },
        "stems": {
            "en": "Which country's flag is this?",
            "ka": "რომელი ქვეყნის დროშაა?",
            "de": "Zu welchem Land gehört diese Flagge?",
            "es": "¿De qué país es esta bandera?",
            "fr": "De quel pays est ce drapeau ?",
            "it": "Di quale paese è questa bandiera?",
            "pt": "De que país é esta bandeira?",
        },
    },
}

DIFF_ORDER = {"easy": 0, "medium": 1, "hard": 2}


def sq(text: str) -> str:
    return "'" + text.replace("'", "''") + "'"


def jarr(items) -> str:
    return sq(json.dumps(list(items), ensure_ascii=False)) + "::jsonb"


def lang_value(entry_map, lang, fallback_en):
    if isinstance(entry_map, dict):
        return entry_map.get(lang, entry_map["en"] if "en" in entry_map else fallback_en)
    return fallback_en


def validate_entry(slug, e):
    errs = []
    key = e.get("key", "?")
    # Authoring tools sometimes copy thumb URLs with UTM junk attached.
    e["image"] = (e.get("image") or "").split("?")[0]
    img = e["image"]
    if not img.startswith("https://upload.wikimedia.org/"):
        errs.append(f"{slug}/{key}: image not on upload.wikimedia.org: {img[:60]}")
    lic = (e.get("license") or "").strip()
    if not LICENSE_OK.match(lic):
        errs.append(f"{slug}/{key}: license not in allowlist: {lic!r}")
    if e.get("difficulty") not in DIFF_ORDER:
        errs.append(f"{slug}/{key}: bad difficulty {e.get('difficulty')!r}")
    answers = e.get("answers") or {}
    wrong = e.get("wrong") or {}
    if "en" not in answers or "ka" not in answers:
        errs.append(f"{slug}/{key}: answers must include en and ka")
        return errs
    if "en" not in wrong or "ka" not in wrong:
        errs.append(f"{slug}/{key}: wrong must include en and ka")
        return errs
    for lang in LANGS:
        ans = lang_value(answers, lang, answers["en"])
        wr = lang_value(wrong, lang, wrong["en"])
        opts = [ans] + list(wr)
        if len(wr) != 3:
            errs.append(f"{slug}/{key}/{lang}: needs exactly 3 wrong options")
            continue
        if len(set(o.strip().lower() for o in opts)) != 4:
            errs.append(f"{slug}/{key}/{lang}: options not distinct: {opts}")
        for o in opts:
            if not o or not o.strip():
                errs.append(f"{slug}/{key}/{lang}: empty option")
            elif len(o) > MAX_ANSWER:
                errs.append(f"{slug}/{key}/{lang}: option >{MAX_ANSWER} chars: {o!r} ({len(o)})")
    return errs


def main() -> None:
    all_errs = []
    lines = []
    lines.append("-- Six picture-guess categories for the Popular row, with their full")
    lines.append("-- question banks in all seven app languages.")
    lines.append("--")
    lines.append("-- Generated by scripts/popular-image-categories/build-migration.py from")
    lines.append("-- spec/*.json beside it. Regenerate rather than editing by hand.")
    lines.append("--")
    lines.append("-- Images are Wikimedia-Commons-hosted with free licenses only (checked")
    lines.append("-- at authoring time and again by the generator). Non-English rows carry")
    lines.append("-- translated_from so the translation cron never re-translates them.")
    lines.append("-- All ids are uuid5, so applying this twice inserts nothing new.")
    lines.append("")
    lines.append("BEGIN;")
    lines.append("")

    for slug, cfg in CATEGORIES.items():
        spec_path = SPECS / f"{slug}.json"
        entries = json.loads(spec_path.read_text())
        if len(entries) != 70:
            all_errs.append(f"{slug}: expected 70 entries, got {len(entries)}")
        seen_keys = set()
        seen_answers = set()
        for e in entries:
            k = e.get("key")
            if k in seen_keys:
                all_errs.append(f"{slug}: duplicate key {k}")
            seen_keys.add(k)
            a = (e.get("answers") or {}).get("en", "").strip().lower()
            if a in seen_answers:
                all_errs.append(f"{slug}: duplicate en answer {a!r}")
            seen_answers.add(a)
            all_errs.extend(validate_entry(slug, e))

        for stem in cfg["stems"].values():
            if len(stem) > MAX_QUESTION:
                all_errs.append(f"{slug}: stem >{MAX_QUESTION} chars: {stem!r}")

        if all_errs:
            continue

        cat_id = uuid.uuid5(NS, f"category/{slug}")
        entries_sorted = sorted(
            enumerate(entries), key=lambda p: (DIFF_ORDER[p[1]["difficulty"]], p[0])
        )
        total_levels = (len(entries_sorted) + PER_LEVEL - 1) // PER_LEVEL

        lines.append(f"-- ══ {slug} ══")
        lines.append(
            "INSERT INTO public.categories (id, category_id, name, icon, color, type, is_active, total_levels, sort_order)"
        )
        lines.append(
            f"VALUES ('{cat_id}', {sq(slug)}, {sq(cfg['names']['ka'])}, {sq(cfg['icon'])}, "
            f"{sq(cfg['color'])}, 'fun', true, {total_levels}, 0)"
        )
        lines.append("ON CONFLICT (category_id) DO NOTHING;")
        lines.append("")
        lines.append("INSERT INTO public.category_translations (category_id, language, name) VALUES")
        tr_rows = [
            f"  ('{cat_id}', {sq(lang)}, {sq(cfg['names'][lang])})" for lang in LANGS
        ]
        lines.append(",\n".join(tr_rows))
        lines.append("ON CONFLICT (category_id, language) DO NOTHING;")
        lines.append("")

        lines.append("INSERT INTO public.questions (")
        lines.append("  id, category_id, language, question_text, correct_answer, incorrect_answers,")
        lines.append("  image_url, difficulty, level_number, is_active, in_production, translated_from")
        lines.append(") VALUES")
        rows = []
        for level_pos, (orig_idx, e) in enumerate(entries_sorted):
            level = level_pos // PER_LEVEL + 1
            en_id = uuid.uuid5(NS, f"{slug}/{e['key']}/en")
            for lang in LANGS:
                qid = uuid.uuid5(NS, f"{slug}/{e['key']}/{lang}")
                stem = cfg["stems"][lang]
                ans = lang_value(e["answers"], lang, e["answers"]["en"])
                wr = lang_value(e["wrong"], lang, e["wrong"]["en"])
                translated_from = "NULL" if lang == "en" else f"'{en_id}'"
                rows.append(
                    f"  ('{qid}', '{cat_id}', {sq(lang)}, {sq(stem)}, {sq(ans)}, {jarr(wr)}, "
                    f"{sq(e['image'])}, {sq(e['difficulty'])}, {level}, true, true, {translated_from})"
                )
        lines.append(",\n".join(rows))
        lines.append("ON CONFLICT (id) DO NOTHING;")
        lines.append("")

    if all_errs:
        sys.exit("Validation failed:\n" + "\n".join(f"  - {e}" for e in all_errs))

    lines.append("COMMIT;")
    lines.append("")
    OUT.write_text("\n".join(lines))
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()

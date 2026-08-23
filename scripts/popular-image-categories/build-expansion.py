#!/usr/bin/env python3
"""Turn harvested Wikidata entries into a spec, and the spec into an ADDITIVE
migration.

The v2 generator rebanks: it retires everything active and ships a fresh 70.
This one only adds. The six picture categories each hold 70 distinct
questions per language and the level maths used to advertise 49 levels for
them, so players ran out of real content at level 7 and saw the same
pictures again. Retiring the existing bank to add to it would be the wrong
trade; these rows join it.

Input is whatever `harvest.py` produced: subject, picture, and the name in
all seven app languages taken from Wikidata's own labels, so the Georgian
answers are not transliterated by hand.

  python3 build-expansion.py <slug> <harvested.json> <out.sql>

Rules enforced here rather than trusted:
  * nothing whose English answer already exists in the category
  * nothing whose PICTURE already exists in the category, under any name
  * every language needs a name, and no option may exceed MAX_ANSWER
  * the four options on a card must be distinct in every language
  * level_number lands in 1..20, because getCategoryQuestions cannot serve
    anything outside that
"""
import importlib.util
import json
import pathlib
import random
import sys
import uuid

HERE = pathlib.Path(__file__).parent
spec = importlib.util.spec_from_file_location("bm", HERE / "build-migration.py")
bm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bm)

LANGS = bm.LANGS
MAX_ANSWER = bm.MAX_ANSWER
PER_LEVEL = bm.PER_LEVEL
MAX_LEVEL = 20  # questionService clamps its window and its fallback here
KEY_PREFIX = "w-"  # "w" for wikidata; never collides with v1/v2 keys


def existing_bank(slug):
    """What the category already holds: English answers AND picture URLs.

    Both are needed. Wikidata carries a country under more than one name --
    "Czechia" and "Czech Republic", "Denmark" and "Kingdom of Denmark" -- and
    the two entries point at the SAME flag file. Matching on the answer text
    alone lets that through, and the result is the repeated picture the
    expansion exists to remove, wearing a different label."""
    answers, images = set(), set()
    for name in (f"{slug}.json", f"{slug}_v2.json"):
        p = HERE / "spec" / name
        if not p.exists():
            continue
        for e in json.loads(p.read_text()):
            answers.add(e["answers"]["en"].strip().lower())
            images.add(e["image"])
    return answers, images


def build_spec(slug, harvested):
    taken, seen_images = existing_bank(slug)
    # Most-linked first: that ordering is the difficulty curve.
    entries = sorted(harvested, key=lambda e: -e.get("sitelinks", 0))

    usable = []
    for e in entries:
        labels = e.get("labels", {})
        en = (labels.get("en") or "").strip()
        if not en or en.lower() in taken:
            continue
        # The same picture, whatever it is called. Sorted most-famous-first,
        # so when two Wikidata items share a file the better known name wins.
        if e["thumb"] in seen_images or e.get("file", "") in seen_images:
            continue
        if any(not (labels.get(l) or "").strip() for l in LANGS):
            continue
        if any(len(labels[l].strip()) > MAX_ANSWER for l in LANGS):
            continue
        taken.add(en.lower())
        seen_images.add(e["thumb"])
        if e.get("file"):
            seen_images.add(e["file"])
        usable.append({**e, "labels": {l: labels[l].strip() for l in LANGS}})

    # Distractors come from neighbours in the same ranking: things of similar
    # fame in the same category, which is what makes a card hard rather than
    # a giveaway.
    out = []
    for i, e in enumerate(usable):
        pool = [x for j, x in enumerate(usable) if j != i]
        if len(pool) < 3:
            break
        # A window of similar fame, then a deterministic spread WITHIN it.
        # Taking the three nearest produced cliques: Albania, Algeria,
        # Afghanistan and Iran sat next to each other in the ranking and so
        # became each other's options on every card, which a player learns in
        # two rounds. Seeding on the subject's own id keeps runs reproducible.
        lo, hi = max(0, i - 30), min(len(usable), i + 31)
        window = [x for x in usable[lo:hi] if x is not e]
        if len(window) < 8:
            window = pool
        rng = random.Random(e["qid"])
        rng.shuffle(window)
        picks = []
        for cand in window:
            if len(picks) == 3:
                break
            # An option that reads the same as the answer in ANY language is a
            # broken card in that language, even if the English differs.
            if any(cand["labels"][l].lower() == e["labels"][l].lower() for l in LANGS):
                continue
            if any(cand["labels"][l].lower() == p["labels"][l].lower()
                   for p in picks for l in LANGS):
                continue
            picks.append(cand)
        if len(picks) < 3:
            continue

        third = max(1, len(usable) // 3)
        difficulty = "easy" if i < third else ("medium" if i < 2 * third else "hard")
        key = f"{KEY_PREFIX}{e['qid'].lower()}"
        out.append({
            "key": key,
            "image": e["thumb"],
            "file": e.get("file", ""),
            "license": e["license"],
            "difficulty": difficulty,
            "answers": {l: e["labels"][l] for l in LANGS},
            "wrong": {l: [p["labels"][l] for p in picks] for l in LANGS},
        })
    return out


def build_sql(slug, entries, existing_per_language):
    cfg = bm.CATEGORIES[slug]
    cat_id = uuid.uuid5(bm.NS, f"category/{slug}")
    sq, jarr = bm.sq, bm.jarr

    # Continue after the levels the current bank fills, and never past 20.
    start_level = min(MAX_LEVEL, max(1, existing_per_language // PER_LEVEL + 1))
    span = max(1, MAX_LEVEL - start_level + 1)
    per_level = max(1, -(-len(entries) // span))  # ceil

    lines = [
        f"-- {slug}: more questions, so the category stops repeating itself.",
        "--",
        "-- Generated by scripts/popular-image-categories/build-expansion.py from",
        f"-- spec/{slug}_expansion.json. Regenerate rather than editing by hand.",
        "--",
        "-- ADDITIVE: nothing is retired. The existing bank stays exactly as it is;",
        f"-- these {len(entries)} subjects join it, in all seven app languages.",
        "--",
        "-- Answers are Wikidata's own labels per language, not transliterations.",
        f"-- Levels start at {start_level} (after what the current bank fills) and stop",
        f"-- at {MAX_LEVEL}, which is as far as question selection reaches.",
        "--",
        "-- Ids are uuid5 of the subject's Wikidata id, so applying this twice",
        "-- inserts nothing the second time.",
        "",
        "BEGIN;",
        "",
        "INSERT INTO public.questions (",
        "  id, category_id, language, question_text, correct_answer, incorrect_answers,",
        "  image_url, difficulty, level_number, is_active, in_production, translated_from",
        ") VALUES",
    ]

    rows = []
    for idx, e in enumerate(entries):
        level = min(MAX_LEVEL, start_level + idx // per_level)
        en_id = uuid.uuid5(bm.NS, f"{slug}/{e['key']}/en")
        for lang in LANGS:
            qid = uuid.uuid5(bm.NS, f"{slug}/{e['key']}/{lang}")
            stem = cfg["stems"][lang]
            ans = e["answers"][lang]
            wr = e["wrong"][lang]
            translated_from = "NULL" if lang == "en" else f"'{en_id}'"
            rows.append(
                f"  ('{qid}', '{cat_id}', {sq(lang)}, {sq(stem)}, {sq(ans)}, {jarr(wr)}, "
                f"{sq(e['image'])}, {sq(e['difficulty'])}, {level}, true, true, {translated_from})"
            )
    lines.append(",\n".join(rows))
    lines.append("ON CONFLICT (id) DO NOTHING;")
    lines.append("")
    lines.append("COMMIT;")
    return "\n".join(lines) + "\n"


def main():
    slug, harvested_path, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
    # Optional fourth argument: stop after this many, most famous first.
    #
    # More is not better past a point. Twenty levels is the ceiling question
    # selection can serve, so 200 per language fills the category; beyond
    # that the only thing another hundred subjects buys is variety within a
    # level, and it is bought by reaching further down the fame ranking. For
    # cities the harvest runs 471 deep, and rank 300 is Wuppertal and
    # Kropyvnytskyi -- real cities, and not a fair question for a player in
    # Tbilisi or Madrid. The cut belongs here rather than in the query,
    # because where it falls is a judgement about the game.
    limit = int(sys.argv[4]) if len(sys.argv) > 4 else None
    harvested = json.loads(pathlib.Path(harvested_path).read_text())
    entries = build_spec(slug, harvested)
    if limit is not None:
        entries = entries[:limit]
        # Difficulty is thirds of the list, so it has to be redrawn against
        # the list that ships. Otherwise a truncated run is labelled "easy"
        # all the way down, because every survivor was in the top third of
        # the harvest.
        third = max(1, len(entries) // 3)
        for i, e in enumerate(entries):
            e["difficulty"] = "easy" if i < third else ("medium" if i < 2 * third else "hard")

    errs = []
    seen_keys = set()
    for e in entries:
        if e["key"] in seen_keys:
            errs.append(f"duplicate key {e['key']}")
        seen_keys.add(e["key"])
        errs.extend(bm.validate_entry(slug, e))
    if errs:
        sys.exit(f"Validation failed for {slug}:\n" + "\n".join(f"  - {x}" for x in errs[:25]))

    spec_path = HERE / "spec" / f"{slug}_expansion.json"
    spec_path.write_text(json.dumps(entries, ensure_ascii=False, indent=1))

    existing = len(existing_bank(slug)[0])
    pathlib.Path(out_path).write_text(build_sql(slug, entries, existing))
    total = existing + len(entries)
    print(f"{slug}: +{len(entries)} new (bank {existing} -> {total}, "
          f"levels {min(20, existing // 10)} -> {min(20, total // 10)})")


if __name__ == "__main__":
    main()

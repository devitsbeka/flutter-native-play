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
  * level_number lands in 1..MAX_LEVEL, because getCategoryQuestions cannot
    serve anything outside that -- see MAX_PLAYABLE_LEVEL in
    src/services/questionService.ts, which this must agree with
"""
import importlib.util
import json
import pathlib
import random
import re
import sys
import uuid

HERE = pathlib.Path(__file__).parent
spec = importlib.util.spec_from_file_location("bm", HERE / "build-migration.py")
bm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bm)

LANGS = bm.LANGS
MAX_ANSWER = bm.MAX_ANSWER
PER_LEVEL = bm.PER_LEVEL
MAX_LEVEL = 38  # questionService.MAX_PLAYABLE_LEVEL
KEY_PREFIX = "w-"  # "w" for wikidata; never collides with v1/v2 keys

# A mark that is the company's name set in a typeface prints the answer on
# the card. The bank already made this call once -- the v2 logo migration is
# titled "symbol-only marks replace the wordmark bank" -- and Wikidata's P154
# hands back "Samsung wordmark.svg", "Ferrari wordmark.svg", "KFC 2026
# (wordmark).svg" without distinguishing them, so the rule has to be applied
# here. It costs some famous brands. A brand nobody has to guess costs more.
WORDMARK_FILE = re.compile(
    r"\b(wordmark|word[ -]?mark|text[ -]?logo|lettering|typeface|logotype)\b", re.I)

# A brand mark on Commons is drawn: SVG, or PNG with transparency. A JPEG
# under P154 is almost always a photograph of the mark in the world rather
# than the mark -- a Guinness pub sign in Gorlitz, a Vauxhall neon, a
# Cadillac grille, a postage stamp of the Mosfilm statue, an Alfa Romeo badge
# on the nose of a car. Fourteen of 314 harvested logos were exactly that,
# and every one of them is a worse card than the flat mark would be.
PHOTOGRAPH = re.compile(r"\.(jpe?g|tiff?)$", re.I)

# "Volkswagen Group" is not a second company to "Volkswagen", and Wikidata
# carries both -- with different logo files, so neither the answer check nor
# the picture check caught it. The bank shipped the VW roundel and the group
# mark as two questions, and Wikidata's Georgian label for Mercedes-Benz
# Group is "Daimler AG", a name that is on neither picture.
CORPORATE_SUFFIX = re.compile(
    r"\s+(group|holding|holdings|ag|nv|se|plc|inc\.?|ltd\.?|llc|corp\.?|corporation|"
    r"company|co\.|s\.?a\.?|gmbh|kk|oyj|ab)$", re.I)


def company_key(name):
    """A name stripped to the thing a player would actually say."""
    previous = None
    key = name.strip().lower()
    while key != previous:  # "Sony Group Corporation" needs two passes
        previous = key
        key = CORPORATE_SUFFIX.sub("", key).strip()
    return key


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
            answers.add(company_key(e["answers"]["en"]))
            images.add(e["image"])
    return answers, images


def rejected(slug):
    """English answers a person looked at and turned down.

    The contact sheet is the review step, and a review that cannot be
    recorded has to be repeated by hand on every regeneration. So it is
    recorded: spec/<slug>_reject.json is a list of English answers, each with
    the reason it was rejected, and the generator drops them.

    The queries cannot catch these. guess_logo asks Wikidata for business
    enterprises and gets the city of Pardubice, Jefferson's Monticello and
    Istanbul's Maiden's Tower, because each has a P154 and a loose enough
    type claim. Every one is a genuine logo; none is a brand anybody is going
    to name.
    """
    p = HERE / "spec" / f"{slug}_reject.json"
    if not p.exists():
        return set()
    return {e["answer"].strip().lower() for e in json.loads(p.read_text())}


def difficulty_for(slug, e, i, n):
    """How hard this card is.

    Everywhere else, fame is the answer: the best-known subject is the
    easiest, so position in the sitelink ranking is the difficulty.

    Logos are not like that, because what makes a logo hard is not how
    obscure the company is -- it is whether the mark says the name. Mazda's
    ellipse, Alfa Romeo's serpent and Rolex's crown are hard for a household
    brand; "TOSHIBA" set in a typeface is not hard for anyone who reads
    Latin script, however the ranking places it. Commons will not tell us
    which is which, but the shape does: a mark that spells something out is
    wide, and a symbol is roughly square. That is the difference the levels
    should carry, and it is what "more difficult ones" asked for.
    """
    if slug == "guess_logo" and e.get("h"):
        ratio = e["w"] / e["h"]
        return "hard" if ratio < 1.5 else ("medium" if ratio < 2.4 else "easy")
    third = max(1, n // 3)
    return "easy" if i < third else ("medium" if i < 2 * third else "hard")


def build_spec(slug, harvested, limit=None):
    taken, seen_images = existing_bank(slug)
    taken |= rejected(slug)
    # Most-linked first: that ordering is the difficulty curve.
    entries = sorted(harvested, key=lambda e: -e.get("sitelinks", 0))

    usable = []
    for e in entries:
        labels = e.get("labels", {})
        en = (labels.get("en") or "").strip()
        if not en or en.lower() in taken or company_key(en) in taken:
            continue
        # The same picture, whatever it is called. Sorted most-famous-first,
        # so when two Wikidata items share a file the better known name wins.
        if e["thumb"] in seen_images or e.get("file", "") in seen_images:
            continue
        if WORDMARK_FILE.search(e.get("file", "")):
            continue
        if slug == "guess_logo" and PHOTOGRAPH.search(e.get("file", "")):
            continue
        if any(not (labels.get(l) or "").strip() for l in LANGS):
            continue
        if any(len(labels[l].strip()) > MAX_ANSWER for l in LANGS):
            continue
        taken.add(en.lower())
        taken.add(company_key(en))
        seen_images.add(e["thumb"])
        if e.get("file"):
            seen_images.add(e["file"])
        # A brand is spelled the same way in every language. Wikidata's
        # per-language labels are right for a country or a city and wrong for
        # a company: they give "Universität Oslo", "Olimpíadas", and in
        # Georgian a transliteration, so one card ends up offering three
        # Latin names and one in another alphabet. What the mark says is the
        # answer, and the mark says it once. See 20260902160000, which makes
        # the same correction to what already shipped.
        per_language = (
            {l: en for l in LANGS}
            if slug == "guess_logo"
            else {l: labels[l].strip() for l in LANGS}
        )
        usable.append({**e, "labels": per_language})

    # The cut happens HERE, before distractors and difficulty are worked out,
    # so both are computed against the list that ships. Truncating afterwards
    # left every entry labelled against the full harvest -- and, worse, an
    # earlier version re-derived difficulty from position after the fact and
    # silently overwrote the shape rule that makes a symbol harder than a
    # wordmark, calling Burberry's nameplate "hard" and Mazda's ellipse
    # "easy".
    if limit is not None:
        usable = usable[:limit]

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

        difficulty = difficulty_for(slug, e, i, len(usable))
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
    entries = build_spec(slug, harvested, limit)

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

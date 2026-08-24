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
import os
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
    r"\s+(group|holding|holdings|ag|nv|se|plc|inc\.?|ltd\.?|limited|llc|corp\.?|"
    r"corporation|company|co\.|s\.?a\.?|gmbh|kk|oyj|ab)$", re.I)


# Countries whose full name does not fit on an answer button.
#
# MAX_ANSWER is 20 characters and that is a real constraint -- four options
# on a phone -- so "Saint Vincent and the Grenadines" cannot ship as written.
# Dropping those entries instead costs the bank Bosnia, the UAE, the
# Dominican Republic and the Congo, which is not a flag set anyone would
# call complete.
#
# Wikidata has a short-name property and it was tried first. It returns
# "B&H", "DRC", "FM", "BAT", "PNG" -- an abbreviation is not an answer a
# quiz should print, and half the languages have none at all. So these are
# written out by hand, and almost all of them are the same operation: delete
# the scaffolding words and keep the name. "კომორის კუნძულების კავშირი"
# loses "კავშირი" (Union). "არაბთა გაერთიანებული საამიროები" keeps
# "საამიროები" (the Emirates). Nothing here is translated from scratch; each
# one is Wikidata's own label for that language with words removed, which is
# why there is no language in the table whose name had to be invented.
#
# A country that needs a short name and has no honest one is not in this
# table -- it is in spec/guess_flag_reject.json. The Central African
# Republic is the case: every language calls it the republic, and "Central
# Africa" is a region, not a country.
SHORT_NAMES = {
    "Bosnia and Herzegovina": {
        "en": "Bosnia", "ka": "ბოსნია", "de": "Bosnien", "es": "Bosnia",
        "fr": "Bosnie", "it": "Bosnia", "pt": "Bósnia"},
    "Democratic Republic of the Congo": {
        "en": "DR Congo", "ka": "კონგოს დრ", "de": "DR Kongo", "es": "RD Congo",
        "fr": "RD Congo", "it": "RD Congo", "pt": "RD Congo"},
    "United Arab Emirates": {
        "en": "UAE", "ka": "საამიროები", "de": "VAE", "es": "EAU",
        "fr": "Émirats", "it": "Emirati", "pt": "Emirados"},
    "Republic of the Congo": {"en": "Congo"},
    "Dominican Republic": {
        "en": "Dominican Rep.", "ka": "დომინიკელთა რესპ.", "de": "Dom. Republik",
        "fr": "Rép. dominicaine", "it": "Rep. Dominicana", "pt": "Rep. Dominicana"},
    "Papua New Guinea": {"fr": "Papouasie-N.-Guinée"},
    "Comoros": {"ka": "კომორის კუნძულები"},
    "Palestine": {"ka": "პალესტინა"},
    "São Tomé and Príncipe": {
        "en": "São Tomé", "de": "São Tomé", "es": "Santo Tomé"},
    "Saint Kitts and Nevis": {
        "en": "St Kitts & Nevis", "de": "St. Kitts und Nevis",
        "es": "San Cristóbal", "fr": "Saint-Kitts-et-Nevis", "pt": "São Cristóvão"},
    "Saint Vincent and the Grenadines": {
        "en": "St Vincent", "ka": "სენტ-ვინსენტი", "de": "St. Vincent",
        "es": "San Vicente", "fr": "Saint-Vincent", "it": "Saint Vincent",
        "pt": "São Vicente"},
    "Federated States of Micronesia": {
        "en": "Micronesia", "ka": "მიკრონეზია", "de": "Mikronesien",
        "es": "Micronesia", "fr": "Micronésie", "it": "Micronesia",
        "pt": "Micronésia"},
    "Northern Cyprus": {"de": "Nordzypern", "pt": "Chipre do Norte"},
}


def company_key(name):
    """A name stripped to the thing a player would actually say."""
    return brand_name(name).lower()


def brand_name(name):
    """The same strip, with the capitals left alone, so it can be an answer.

    Wikidata's label is the legal name: "Panasonic Holdings Corporation",
    "Colgate-Palmolive Company", "Sony Group Corporation". None of those is
    what the mark says or what a player would type, and at 20 characters for
    an answer button most of them do not fit either.
    """
    previous = None
    out = name.strip()
    while out != previous:  # "Sony Group Corporation" needs two passes
        previous = out
        out = CORPORATE_SUFFIX.sub("", out).strip()
        # "OCLC, Inc." loses "Inc." and keeps the comma that introduced it,
        # and "OCLC," shipped as an answer on a card.
        out = out.rstrip(",;:-").strip()
    return out


# Brands whose Wikidata label is neither what the logo says nor short enough
# to print, and where the strip above cannot get there on its own.
#
# The line is drawn at brands, not at long names. 108 subjects were dropped
# for a label over 20 characters and all but a dozen were universities,
# academies, museums and development banks -- the University of Poitiers is
# a real logo and not a question anybody can answer. Those stay dropped. The
# dozen below are household marks that happen to be registered under a
# corporate mouthful.
LOGO_ALIASES = {
    "World Health Organization": "WHO",
    "The Walt Disney Company": "Disney",
    "Walt Disney Studios Motion Pictures": "Disney Studios",
    "National Basketball Association": "NBA",
    "Major League Baseball": "MLB",
    "Massachusetts Institute of Technology": "MIT",
    "American Broadcasting Company": "ABC",
    "Fox Broadcasting Company": "Fox",
    "Warner Bros. Entertainment": "Warner Bros.",
    "Koninklijke Philips NV": "Philips",
    "The Coca-Cola Company": "Coca-Cola",
    "National Geographic Society": "National Geographic",
    "Ultimate Fighting Championship": "UFC",
    "Universal Music Group": "Universal Music",
    "China Central Television": "CCTV",
    "Marriott International": "Marriott",
    # "Products" and "Brands" are not corporate suffixes in general -- taking
    # them off by rule would turn "General Mills Brands" into something wrong
    # somewhere -- but on these two the mark says the short name.
    "Avon Products": "Avon",
    "Gibson Brands": "Gibson",
}


def existing_bank(slug):
    """What the category already holds: English answers AND picture URLs.

    Both are needed. Wikidata carries a country under more than one name --
    "Czechia" and "Czech Republic", "Denmark" and "Kingdom of Denmark" -- and
    the two entries point at the SAME flag file. Matching on the answer text
    alone lets that through, and the result is the repeated picture the
    expansion exists to remove, wearing a different label."""
    answers, images = set(), set()
    # Every spec that has ever shipped for this category, the earlier
    # expansions included. Leaving those out is not a small miss: the first
    # expansion put 230 celebrities and 118 brands in the bank, and a second
    # round that cannot see them offers the same 230 faces again, which is
    # the exact complaint this work exists to answer.
    for p in sorted((HERE / "spec").glob(f"{slug}*.json")):
        # Everything alongside the specs that is NOT a spec: the review's
        # rejections and the type lookup, neither of which is a list of
        # questions.
        if p.name.endswith(("_reject.json", "_types.json")):
            continue
        for e in json.loads(p.read_text()):
            answers.add(e["answers"]["en"].strip().lower())
            answers.add(company_key(e["answers"]["en"]))
            images.add(e["image"])
    return answers, images


def institutions(slug):
    """Wikidata ids that are a university, museum, library, bank or memorial.

    Built by scripts/popular-image-categories/spec/<slug>_types.json, which
    is written by the type query in the harvest tooling: P31/P279* against a
    short list of classes, so "public research university" is caught without
    enumerating every variant.

    This filter exists because removing the answer-length limit removed an
    accident. Wikidata's business-enterprise query returns the University of
    Poitiers, the Museum of Modern Art and the Bank of Albania, and they were
    being dropped for having names longer than an answer button rather than
    for being institutions. Once brands like Philips and Warner Bros. stopped
    being dropped alongside them, thirty universities came in.

    A logo is a fine logo. "Which university is this?" is a different game.
    """
    p = HERE / "spec" / f"{slug}_types.json"
    if not p.exists():
        return set()
    return set(json.loads(p.read_text()))


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
    not_a_brand = institutions(slug)
    # Most-linked first: that ordering is the difficulty curve.
    entries = sorted(harvested, key=lambda e: -e.get("sitelinks", 0))

    usable = []
    for e in entries:
        labels = e.get("labels", {})
        en = (labels.get("en") or "").strip()
        if not en or en.lower() in taken or company_key(en) in taken:
            continue
        if e["qid"] in not_a_brand:
            continue
        # The same picture, whatever it is called. Sorted most-famous-first,
        # so when two Wikidata items share a file the better known name wins.
        if e["thumb"] in seen_images or e.get("file", "") in seen_images:
            continue
        if WORDMARK_FILE.search(e.get("file", "")):
            continue
        if slug == "guess_logo" and PHOTOGRAPH.search(e.get("file", "")):
            continue
        # Every language needs a label -- except for logos, where the answer
        # is the English name in all seven and the others are never read.
        # Nineteen brands were being dropped for the absence of a
        # Portuguese label that would not have appeared on any card.
        if slug != "guess_logo" and any(
                not (labels.get(l) or "").strip() for l in LANGS):
            continue
        # A brand is spelled the same way in every language. Wikidata's
        # per-language labels are right for a country or a city and wrong for
        # a company: they give "Universität Oslo", "Olimpíadas", and in
        # Georgian a transliteration, so one card ends up offering three
        # Latin names and one in another alphabet. What the mark says is the
        # answer, and the mark says it once. See 20260902160000, which makes
        # the same correction to what already shipped.
        brand = LOGO_ALIASES.get(en) or brand_name(en)
        per_language = (
            {l: brand for l in LANGS}
            if slug == "guess_logo"
            else {l: labels[l].strip() for l in LANGS}
        )
        per_language.update(
            {l: v for l, v in SHORT_NAMES.get(en, {}).items() if l in per_language})
        # Length is checked on what will be PRINTED ON THE BUTTON, which for
        # a logo is the English name in all seven languages. Checking
        # Wikidata's own per-language labels instead threw away 174 brands
        # for the length of a German or Portuguese name that was never going
        # to be shown -- "Bayerische Motoren Werke" losing BMW its card.
        if any(len(per_language[l]) > MAX_ANSWER for l in LANGS):
            continue
        taken.add(en.lower())
        taken.add(company_key(en))
        taken.add(per_language["en"].lower())
        seen_images.add(e["thumb"])
        if e.get("file"):
            seen_images.add(e["file"])
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

    # Continue after the levels the current bank fills, and never past the
    # ceiling. START_LEVEL overrides it, because "how many questions are in
    # the bank" and "what is the highest level number in use" are not the
    # same thing once a bank has been numbered under a lower ceiling: 300
    # celebrities numbered fifteen to a level stop at 20, not at 30. New
    # subjects have to land ABOVE the last number in use, or the repack that
    # follows -- which orders by level, then picture -- shuffles them into
    # the middle of the difficulty curve instead of the end of it.
    start_level = min(MAX_LEVEL, max(1, existing_per_language // PER_LEVEL + 1))
    if os.environ.get("START_LEVEL"):
        start_level = min(MAX_LEVEL, int(os.environ["START_LEVEL"]))
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
    # Counted before the new spec is written, or existing_bank() reads the
    # file this run is about to create and reports the bank as already
    # holding what has not shipped yet.
    existing = len(existing_bank(slug)[1])
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

    # A round number, so a second expansion cannot overwrite the spec the
    # first one shipped from -- which existing_bank() now reads to know what
    # is already in the bank.
    tag = os.environ.get("EXPANSION_TAG", "expansion")
    spec_path = HERE / "spec" / f"{slug}_{tag}.json"
    spec_path.write_text(json.dumps(entries, ensure_ascii=False, indent=1))

    pathlib.Path(out_path).write_text(build_sql(slug, entries, existing))
    total = existing + len(entries)
    print(f"{slug}: +{len(entries)} new (bank {existing} -> {total}, "
          f"levels {min(MAX_LEVEL, existing // PER_LEVEL)} -> "
          f"{min(MAX_LEVEL, total // PER_LEVEL)})")


if __name__ == "__main__":
    main()

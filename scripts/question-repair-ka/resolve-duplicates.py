#!/usr/bin/env python3
"""Cluster the Georgian duplicates and pick which copy of each survives.

Run:  set -a && . ./.env && set +a && python3 scripts/question-repair-ka/resolve-duplicates.py

Writes duplicates-resolved.json, which build-migration.py reads.

Two questions are clustered together when either
  - their normalised stems are identical, and neither row carries media, or
  - scripts/audit-questions.mjs --lang ka reported them as a near-duplicate pair.

The second source is the interesting one and is described in that script: word
overlap on Georgian stems, with the surface forms checked by 4-gram Dice so a
two-word stem cannot match on one shared word.

Within a cluster:

  - pairs listed under "protect" in dup_decisions.json are left alone. These
    read as duplicates and are not — the 16th and the 32nd president, the
    largest organ and the largest *internal* organ.
  - retirements listed under "retire" are applied as written. These are the
    clusters whose copies disagreed about the answer, which is a factual call
    and not one to make by score.
  - what is left, if every copy agrees on the answer, is resolved by score:
    a stem that ends in a question mark and fits the render limits, with
    balanced options and an A grade, beats one that does not. Ties go to the
    oldest row, so the survivor is the one that has been served longest.

  - a cluster whose copies still disagree after the hand decisions is LEFT
    ALONE and reported. Guessing which of two answers is right is exactly the
    thing this script must not do.
"""

import json
import os
import pathlib
import re
import sys
import unicodedata
import urllib.request
from collections import Counter, defaultdict

HERE = pathlib.Path(__file__).parent
OUT = HERE / "duplicates-resolved.json"

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("VITE_SUPABASE_PUBLISHABLE_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    sys.exit("Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY — see .env.example")

COLUMNS = (
    "id,category_id,question_text,correct_answer,incorrect_answers,in_production,"
    "ai_review_grade,created_at,image_url,video_url,audio_url"
)


def fetch():
    rows, page = [], 1000
    for offset in range(0, 20000, page):
        url = (
            f"{SUPABASE_URL}/rest/v1/questions?select={COLUMNS}"
            f"&language=eq.ka&order=id&offset={offset}&limit={page}"
        )
        req = urllib.request.Request(
            url, headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
        )
        with urllib.request.urlopen(req) as resp:
            batch = json.load(resp)
        rows.extend(batch)
        if len(batch) < page:
            break
    return [r for r in rows if r["in_production"]]


rows = fetch()
by_id = {r["id"]: r for r in rows}
by_short = {r["id"][:8]: r["id"] for r in rows}

# Cluster on the text the migration will leave behind, not on what is live now.
# Shortening two long stems down to the same short one creates a duplicate that
# did not exist before: "რომელ კონტინენტზეა ყველაზე მეტი ცოცხალი ენა?" is a
# rewrite of a 95-character stem and collides with a row that already said it.
SKIP = {"dup_decisions.json", "answer_fixes.json", "duplicates-resolved.json"}
for path in sorted(HERE.glob("*.json")):
    if path.name in SKIP:
        continue
    data = json.loads(path.read_text())
    entries = data.items() if path.name == "shorten.json" else (
        (f["id"], f["fix"]["question_text"]) for f in data if f.get("fix", {}).get("question_text")
    )
    for short, text in entries:
        qid = by_short.get(short, short if short in by_id else None)
        if qid:
            by_id[qid]["question_text"] = text


def options(q):
    wrong = q["incorrect_answers"]
    if isinstance(wrong, str):
        wrong = json.loads(wrong)
    return [str(q["correct_answer"])] + [str(w) for w in wrong]


def norm(s):
    s = unicodedata.normalize("NFKC", str(s)).lower()
    s = re.sub(r"[^\w\s]", " ", s, flags=re.UNICODE)
    return re.sub(r"\s+", " ", s).strip()


STOP = set(
    (
        "რომელი რომელია რომელმა რომელ რომელს რომელში რომელზე რომელიც რომელსაც ვინ ვის რა რას "
        "რის რაა რად სად საიდან როდის რატომ როგორ რამდენი რამდენს ეს ის ამ იმ არის იყო არიან "
        "იყვნენ აქვს ჰქვია ქვია ეწოდება ერქვა თუ და ან რომ ხოლო მაგრამ თავისი მისი მათი ერთ "
        "ერთი შემდეგ დროს მიერ შორის ყველაზე ძირითადი მთავარი ცნობილი შემდეგთაგან "
        "ჩამოთვლილთაგან წარმოადგენს ნიშნავს ეკუთვნის ითვლება არა კი"
    ).split()
)
SUFFIXES = sorted(
    [
        "ებისთვის", "ებისგან", "ისთვის", "ებიდან", "ებთან", "ისგან", "იდან", "ებში", "ებზე",
        "ებმა", "ებს", "ები", "ებ", "თან", "ში", "ზე", "ის", "ით", "ად", "მა", "თა", "ნი",
        "ს", "მ", "ო",
    ],
    key=len,
    reverse=True,
)
GEORGIAN = re.compile(r"[Ⴀ-ჿ]")


def stem(w):
    if not GEORGIAN.search(w):
        return w
    for suffix in SUFFIXES:
        if len(w) - len(suffix) >= 4 and w.endswith(suffix):
            return w[: -len(suffix)]
    return w


def content(s):
    return {stem(w) for w in norm(s).split() if len(w) > 2 and w not in STOP}


def shingles(s):
    t = f" {norm(s)} "
    return {t[i : i + 4] for i in range(max(1, len(t) - 3))}


def jaccard(a, b):
    if not a or not b:
        return 0.0
    shared = len(a & b)
    return shared / (len(a) + len(b) - shared)


def dice(a, b):
    if not a or not b:
        return 0.0
    return 2 * len(a & b) / (len(a) + len(b))


def has_media(q):
    return bool(q["image_url"] or q["video_url"] or q["audio_url"])


# A picture round asks the same thing every time — "რომელი ქალაქია გამოსახული?"
# is asked thirty times over thirty photographs — so identical stems there are
# the design. What makes it a picture round is the stem pointing at something
# it does not name: ეს, გამოსახული, სურათზე. A portrait attached to "ვინ იყო
# სამხრეთ აფრიკის პირველი შავკანიანი პრეზიდენტი?" is decoration, and four
# copies of that question are still four copies.
DEICTIC = re.compile(r"(^|\s)(ეს|ამ)($|[\s?])|გამოსახულ|სურათზე|ფოტოზე|ვიდეოში|ნახეთ|ისმენთ")


def is_picture_round(q):
    return has_media(q) and bool(DEICTIC.search(q["question_text"]))


# ── candidate pairs ───────────────────────────────────────────────────────
words = {r["id"]: content(r["question_text"]) for r in rows}
grams = {r["id"]: shingles(r["question_text"]) for r in rows}
index = defaultdict(list)
frequency = Counter()
for r in rows:
    for w in words[r["id"]]:
        index[w].append(r["id"])
        frequency[w] += 1

RARE = 6
QUALIFIERS = set(
    (
        "ზუსტ დაახლოებ ოფიციალურ საშუალო ჯამურ სრულ მთლიან თანამედროვე ისტორიულ "
        "სამეცნიერო ცნობილ პოპულარულ ტრადიციულ ძირითად კლასიკურ ნამდვილ"
    ).split()
)


def differs_by_subject(a, b):
    """A word used in only a handful of stems is the subject, not filler."""
    for w in (a - b) | (b - a):
        if frequency[w] <= RARE and w not in QUALIFIERS and not re.fullmatch(r"(1[5-9]|20)\d\d", w):
            return True
    return False


pairs = set()
for r in rows:
    mine = words[r["id"]]
    if len(mine) < 2:
        continue
    counts = Counter()
    for w in mine:
        bucket = index[w]
        if len(bucket) >= 200:
            continue
        for other in bucket:
            if other != r["id"]:
                counts[other] += 1
    for other, _ in counts.most_common(8):
        key = tuple(sorted((r["id"], other)))
        if key in pairs:
            continue
        if jaccard(mine, words[other]) < 0.7:
            continue
        if dice(grams[r["id"]], grams[other]) < 0.6:
            continue
        if is_picture_round(r) or is_picture_round(by_id[other]):
            continue
        if differs_by_subject(mine, words[other]):
            continue
        pairs.add(key)

# Identical stems, which the pair search can miss when the stem is very short.
by_stem = defaultdict(list)
for r in rows:
    if is_picture_round(r):
        continue
    by_stem[norm(r["question_text"])].append(r["id"])
for group in by_stem.values():
    for other in group[1:]:
        pairs.add(tuple(sorted((group[0], other))))

# ── clusters ──────────────────────────────────────────────────────────────
parent = {}


def find(x):
    parent.setdefault(x, x)
    while parent[x] != x:
        parent[x] = parent[parent[x]]
        x = parent[x]
    return x


for a, b in pairs:
    ra, rb = find(a), find(b)
    if ra != rb:
        parent[ra] = rb

clusters = defaultdict(set)
for x in parent:
    clusters[find(x)].add(x)
clusters = [c for c in clusters.values() if len(c) > 1]

decisions = json.loads((HERE / "dup_decisions.json").read_text())
protected = {
    tuple(sorted((by_short.get(a, a)[:8], by_short.get(b, b)[:8]))) for a, b, _ in decisions["protect"]
}
manual = {}
for dead, survivor, why in decisions["retire"]:
    a, b = by_short.get(dead, dead), by_short.get(survivor, survivor)
    if a in by_id:
        manual[a] = (b, why)


def score(q):
    opts = options(q)
    longest = max(len(a) for a in opts)
    s = 0
    if q["question_text"].strip().endswith("?"):
        s += 3
    if len(q["question_text"]) <= 70:
        s += 2
    if longest <= 20:
        s += 2
    if q["ai_review_grade"] == "A":
        s += 1
    if has_media(q):
        s += 1
    if len(opts[0]) <= max(len(a) for a in opts[1:]):
        s += 1
    if longest - min(len(a) for a in opts) <= 8:
        s += 1
    return s


# Hand decisions apply whether or not the detector found the pair. Six of these
# are twins it missed: it clusters on stem overlap, and "რა ჰქვია ტრადიციულ
# ქართულ პურს, რომელსაც ხშირად თონეში აცხობენ და მოგრძო, ნავისებური ფორმა
# აქვს?" shares little enough wording with its own shorter twin to fall under
# the threshold.
retire = {qid: {"survivor": s, "why": why} for qid, (s, why) in manual.items()}
unresolved = []
for cluster in clusters:
    rest = [i for i in sorted(cluster) if i not in retire]
    if len(rest) < 2:
        continue
    # A cluster is left alone when every surviving pair inside it was protected
    # by hand — the three planet questions cluster on "planet" and "solar system"
    # and ask three different things.
    if all(
        tuple(sorted((a[:8], b[:8]))) in protected
        for n, a in enumerate(rest)
        for b in rest[n + 1 :]
    ):
        continue
    if len({norm(by_id[i]["correct_answer"]) for i in rest}) > 1:
        unresolved.append(sorted(rest))
        continue
    rest.sort(key=lambda i: (-score(by_id[i]), by_id[i]["created_at"] or "", i))
    for qid in rest[1:]:
        retire[qid] = {
            "survivor": rest[0],
            "why": "same question, same answer; kept the copy that fits the render limits",
        }

OUT.write_text(json.dumps({"retire": retire, "unresolved": unresolved}, ensure_ascii=False, indent=1))
print(f"clusters {len(clusters)} · retire {len(retire)} · left alone {len(unresolved)}")
print(f"in production {len(rows)} -> {len(rows) - len(retire)}")
for cluster in unresolved:
    print("  --")
    for qid in cluster:
        print(f"    {qid[:8]} {by_id[qid]['question_text'][:62]} => {by_id[qid]['correct_answer']}")

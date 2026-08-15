#!/usr/bin/env python3
"""Resolve every question in spec.json to a Wikimedia image URL, and check it.

Run:  python3 scripts/image-questions-ka/resolve-images.py

An image question hides its own text during play — QuizGameScreenProd passes
hideQuestionText={!!currentQuestion.imageUrl} — so the picture has to carry the
question by itself. That makes the picture the thing to get right, and guessing
an upload.wikimedia.org path by hand gets it wrong silently: a 404 shows an
empty card, and a file that has been renamed shows somebody else's photograph.

So the image is not chosen by URL. Each question names a Wikipedia article, and
this script asks the API for that article's lead image. The lead image of
"Giraffe" is a giraffe. The URL it returns is the same
upload.wikimedia.org/.../thumb/... form as all 435 image questions already in
the bank.

Writes resolved.json, and thumbs/ for the visual check (build-contact-sheet.py).

Validated here, before anything reaches the migration:
  * the article exists and has a lead image
  * the thumbnail URL answers 200
  * question <= 70 chars and every option <= 20 (QUALITY_CONSTANTS) — over
    either limit, isValidQuestionLength drops the question from gameplay and
    the row is dead weight in the table
  * four distinct options, all Georgian script
"""

import json
import pathlib
import re
import sys
import time
import urllib.parse
import urllib.request

HERE = pathlib.Path(__file__).parent
SPEC = HERE / "spec.json"
OUT = HERE / "resolved.json"
THUMBS = HERE / "thumbs"

# src/constants/questionQuality.ts — gameplay filters anything over these.
MAX_QUESTION = 70
MAX_ANSWER = 20

API = "https://en.wikipedia.org/w/api.php"
UA = "flutter-native-play question tooling (https://github.com/devitsbeka/flutter-native-play)"


def api(params):
    """One API call, backing off when Wikimedia rate-limits us."""
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.load(resp)
        except urllib.error.HTTPError as e:
            if e.code not in (429, 503) or attempt == 5:
                raise
            wait = 2 ** attempt
            print(f"    {e.code} from the API, waiting {wait}s")
            time.sleep(wait)
    raise RuntimeError("unreachable")


def lead_images(titles, width=1280):
    """title -> thumbnail URL, for up to 20 titles at a time."""
    out = {}
    for i in range(0, len(titles), 20):
        chunk = titles[i : i + 20]
        if i:
            time.sleep(1)  # Wikimedia rate-limits bursts
        data = api(
            {
                "action": "query",
                "titles": "|".join(chunk),
                "prop": "pageimages",
                "piprop": "thumbnail",
                "pithumbsize": width,
                "redirects": 1,
                "format": "json",
            }
        )
        query = data.get("query", {})
        # follow redirects and normalisations back to the title we asked for
        alias = {}
        for kind in ("redirects", "normalized"):
            for r in query.get(kind, []):
                alias[r["to"]] = r["from"]
        for page in query.get("pages", {}).values():
            title = page.get("title")
            while title in alias:
                title = alias[title]
            thumb = page.get("thumbnail", {}).get("source")
            if thumb:
                # the API tags thumbnails with campaign params; the bank's URLs are bare
                out[title] = thumb.split("?")[0]
    return out


def fetch(url, method="GET"):
    """(status, bytes) for an image, backing off on 429/503 like api() does.

    Downloading a hundred files from upload.wikimedia.org in a row gets us
    rate-limited about ten in, so this waits rather than recording a false 429
    against an image that is perfectly fine.
    """
    for attempt in range(6):
        req = urllib.request.Request(url, method=method, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                body = b"" if method == "HEAD" else resp.read()
                size = int(resp.headers.get("Content-Length") or len(body))
                return resp.status, size, body
        except urllib.error.HTTPError as e:
            if e.code not in (429, 503) or attempt == 5:
                return e.code, 0, b""
            time.sleep(2 ** attempt)
        except Exception:  # noqa: BLE001 — network flake, retried like a 503
            if attempt == 5:
                return 0, 0, b""
            time.sleep(2 ** attempt)
    return 0, 0, b""


MAX_BYTES = 1_000_000  # a question card is 144px tall; a 4MB PNG is all cost


def smaller(title, width=640):
    """The same article's lead image, asked for at a narrower width.

    Not done by rewriting the URL: Wikimedia refuses arbitrary widths on large
    files ("Use thumbnail sizes listed on ..."), so a hand-built 640px- path
    400s. Asking the API instead returns whichever rendered size it actually
    has, clamped up to the nearest allowed one. Worth doing because a card is
    144px tall — a 4.7MB PNG is all cost and no pixels the player will see.
    """
    return lead_images([title], width).get(title)


GEORGIAN = re.compile(r"^[Ⴀ-ჿ0-9 \-–—.,:;!?„“\"'()/№]+$")

spec = json.loads(SPEC.read_text())
print(f"{len(spec)} questions in spec.json")

problems = []
for i, q in enumerate(spec):
    where = f"#{i+1} {q['answer']}"
    options = [q["answer"]] + q["wrong"]
    if len(q["stem"]) > MAX_QUESTION:
        problems.append(f"{where}: stem {len(q['stem'])} chars (max {MAX_QUESTION})")
    if len(options) != 4:
        problems.append(f"{where}: {len(options)} options, expected 4")
    if len({o.strip() for o in options}) != 4:
        problems.append(f"{where}: repeats an option: {options}")
    for o in options:
        if len(o) > MAX_ANSWER:
            problems.append(f"{where}: option {len(o)} chars: {o}")
        if not GEORGIAN.match(o):
            problems.append(f"{where}: option is not Georgian script: {o}")
    if not GEORGIAN.match(q["stem"]):
        problems.append(f"{where}: stem is not Georgian script: {q['stem']}")

# the same answer twice in one category means two questions with one picture apiece
# that a player cannot tell apart
seen = {}
for i, q in enumerate(spec):
    key = (q["cat"], q["answer"])
    if key in seen:
        problems.append(f"#{i+1}: {q['answer']} already answers #{seen[key]+1} in {q['cat']}")
    seen[key] = i

if problems:
    print("\nSpec problems:")
    for p in problems:
        print("  " + p)
    sys.exit(1)
print("spec is within the 70/20 gameplay limits, four distinct Georgian options each")

titles = sorted({q["wiki"] for q in spec})
print(f"\nresolving {len(titles)} Wikipedia articles to lead images...")
images = lead_images(titles)
missing = [t for t in titles if t not in images]
if missing:
    print("\nArticles with no lead image (fix the spec):")
    for t in missing:
        print("  " + t)
    sys.exit(1)

THUMBS.mkdir(exist_ok=True)
resolved = []
for i, q in enumerate(spec):
    url = images[q["wiki"]]
    dest = THUMBS / f"{i:03d}.jpg"
    if dest.exists() and dest.stat().st_size > MAX_BYTES:
        dest.unlink()  # cached at full size before the width guard existed
    if dest.exists():  # already downloaded and checked on an earlier run
        print(f"  ok  cached {dest.stat().st_size//1024:5d}K  {q['answer']}")
        resolved.append({**q, "index": i, "image_url": url})
        continue
    time.sleep(0.5)
    status, size, body = fetch(url)
    if status == 200 and size > MAX_BYTES:
        narrow = smaller(q["wiki"])
        if narrow and narrow != url:
            time.sleep(0.5)
            s2, size2, body2 = fetch(narrow)
            if s2 == 200 and size2 < size:
                print(f"      {size//1024}K -> {size2//1024}K at 640px")
                url, size, body = narrow, size2, body2
    flag = "ok " if status == 200 else "BAD"
    print(f"  {flag} {status} {size//1024:5d}K  {q['answer']:22} {url.rsplit('/', 1)[-1][:60]}")
    if status != 200:
        problems.append(f"{q['answer']}: {url} returned {status}")
        continue
    dest.write_bytes(body)
    resolved.append({**q, "index": i, "image_url": url})

if problems:
    print("\nURLs that did not resolve:")
    for p in problems:
        print("  " + p)
    sys.exit(1)

OUT.write_text(json.dumps(resolved, ensure_ascii=False, indent=1) + "\n")
print(f"\nwrote {OUT.name}: {len(resolved)} questions, every image 200 OK")
print(f"thumbnails in {THUMBS.name}/ — run build-contact-sheet.py and look at them")

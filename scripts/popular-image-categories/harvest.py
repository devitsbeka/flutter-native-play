#!/usr/bin/env python3
"""Harvest picture-question subjects from Wikidata.

build-expansion.py has always said its input is "whatever harvest.py
produced" — but harvest.py was never committed, so expanding a category
meant reconstructing the query from the shape of the JSON. This is that
script, written down.

  python3 harvest.py <slug> <out.json> [--min-sitelinks N] [--limit N]

Output is the list build-expansion.py reads:

  {"qid", "labels": {en, ka, de, es, fr, it, pt}, "thumb", "file", "sitelinks"}

Two things it does NOT do, because the builder already does them and doing
them twice would mean two places to keep in step: it does not dedupe against
the existing bank, and it does not pick distractors or difficulty.

Every subject must carry a label in all seven languages. That is the
builder's rule too, and asking Wikidata for them up front is far cheaper
than harvesting 3,000 rows and discarding most of them locally.
"""
import argparse
import hashlib
import json
import sys
import time
import urllib.parse
import urllib.request

LANGS = ["en", "ka", "de", "es", "fr", "it", "pt"]
ENDPOINT = "https://query.wikidata.org/sparql"
# Wikimedia asks for a real name and a way to be contacted.
UA = "MyTrivia/1.0 (https://mytrivia.io) picture-question-harvest"

# What counts as a subject, per category. The property path walks subclasses
# so "port city" and "capital" come along without being listed.
SUBJECTS = {
    "guess_city": "?item wdt:P31/wdt:P279* wd:Q515 .",
    "guess_flag": "?item wdt:P31 wd:Q6256 .",
    "guess_celebrity": "?item wdt:P31 wd:Q5 ; wdt:P106/wdt:P279* wd:Q483501 .",
    "guess_sportsman": "?item wdt:P31 wd:Q5 ; wdt:P106/wdt:P279* wd:Q2066131 .",
}

QUERY = """
SELECT ?item ?sitelinks ?image %(vars)s WHERE {
  %(subject)s
  ?item wdt:P18 ?image ;
        wikibase:sitelinks ?sitelinks .
  FILTER(?sitelinks >= %(minlinks)d)
  %(labels)s
}
ORDER BY DESC(?sitelinks)
LIMIT %(limit)d
"""


def build_query(slug, min_sitelinks, limit):
    subject = SUBJECTS.get(slug)
    if not subject:
        sys.exit(f"no subject pattern for {slug}; known: {', '.join(sorted(SUBJECTS))}")
    # Required, not OPTIONAL: a subject missing any of the seven would be
    # dropped by the builder anyway, and the join is what keeps the result
    # set small enough for the public endpoint's timeout.
    labels = "\n  ".join(
        f'?item rdfs:label ?{l} FILTER(LANG(?{l}) = "{l}")' for l in LANGS
    )
    return QUERY % {
        "vars": " ".join(f"?{l}" for l in LANGS),
        "subject": subject,
        "labels": labels,
        "minlinks": min_sitelinks,
        "limit": limit,
    }


def run_query(query, attempts=3):
    body = urllib.parse.urlencode({"query": query}).encode()
    last = None
    for attempt in range(attempts):
        req = urllib.request.Request(
            ENDPOINT,
            data=body,
            headers={"Accept": "application/sparql-results+json", "User-Agent": UA},
        )
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.loads(r.read())
        except Exception as exc:  # noqa: BLE001 - the endpoint 429s and times out
            last = exc
            # The public endpoint throttles; backing off is expected traffic,
            # not an error worth abandoning a harvest over.
            time.sleep(5 * (attempt + 1))
    sys.exit(f"wikidata query failed after {attempts} attempts: {last}")


def commons_thumb(image_url, width=1280):
    """A Special:FilePath URL as the thumbnail URL the app serves through /img.

    Commons lays thumbnails out by the MD5 of the file name: first hex digit,
    then the first two, then the name. There is no API call for it, and the
    app's own bank is written in exactly this form.
    """
    name = urllib.parse.unquote(image_url.rsplit("/", 1)[-1]).replace(" ", "_")
    digest = hashlib.md5(name.encode()).hexdigest()
    quoted = urllib.parse.quote(name)
    return (
        f"https://upload.wikimedia.org/wikipedia/commons/thumb/"
        f"{digest[0]}/{digest[:2]}/{quoted}/{width}px-{quoted}"
    ), name


COMMONS_API = "https://commons.wikimedia.org/w/api.php"


def fetch_licences(file_titles):
    """LicenseShortName from Commons, 50 titles a call.

    build-expansion.py needs a licence on every entry and will not invent
    one: the picture is somebody else's work and the bank records whose
    terms it is used under. extmetadata is the same field the existing spec
    was written from, so the vocabulary matches what is already there
    ("Public domain", "CC BY-SA 4.0", ...).
    """
    out = {}
    titles = list(file_titles)
    for i in range(0, len(titles), 50):
        batch = titles[i:i + 50]
        params = {
            "action": "query", "format": "json", "prop": "imageinfo",
            "iiprop": "extmetadata", "iiextmetadatafilter": "LicenseShortName",
            "titles": "|".join(batch),
        }
        url = COMMONS_API + "?" + urllib.parse.urlencode(params)
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                pages = json.loads(r.read()).get("query", {}).get("pages", {})
        except Exception as exc:  # noqa: BLE001
            print(f"  licence batch {i // 50} failed: {exc}", file=sys.stderr)
            continue
        for page in pages.values():
            info = (page.get("imageinfo") or [{}])[0]
            short = (info.get("extmetadata") or {}).get("LicenseShortName", {}).get("value")
            if short:
                out[page.get("title", "")] = short
        time.sleep(0.4)  # courtesy: this is a public API
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("out")
    ap.add_argument("--min-sitelinks", type=int, default=60)
    ap.add_argument("--limit", type=int, default=1200)
    args = ap.parse_args()

    data = run_query(build_query(args.slug, args.min_sitelinks, args.limit))
    rows = data["results"]["bindings"]

    out, seen = [], set()
    for row in rows:
        qid = row["item"]["value"].rsplit("/", 1)[-1]
        if qid in seen:
            continue
        seen.add(qid)
        thumb, name = commons_thumb(row["image"]["value"])
        # An SVG thumbnail is a PNG render and fine; the bank already holds
        # flag SVGs served that way.
        out.append({
            "qid": qid,
            "labels": {l: row[l]["value"] for l in LANGS if l in row},
            "thumb": thumb,
            "file": f"File:{name.replace('_', ' ')}",
            "sitelinks": int(row["sitelinks"]["value"]),
        })

    # A subject with no recorded licence is dropped rather than guessed at.
    licences = fetch_licences({e["file"] for e in out})
    before = len(out)
    for e in out:
        e["license"] = licences.get(e["file"], "")
    out = [e for e in out if e["license"]]
    if before != len(out):
        print(f"dropped {before - len(out)} with no licence on Commons")

    with open(args.out, "w", encoding="utf8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(f"{len(out)} subjects -> {args.out}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Build a labeled contact sheet per category for the visual check.

Run:  python3 scripts/popular-image-categories/build-contact-sheet.py [slug...]

Downloads every spec image at 320px and tiles it with its English answer
underneath, ten per row. The sheets are the review artifact: every image in
the bank was looked at by a person (or a model with eyes) before shipping —
that is the only reliable defense against collages, wrong crops, and the
occasional file that is not what its name says.
"""

import json
import pathlib
import sys
import time
import urllib.request

from PIL import Image, ImageDraw

HERE = pathlib.Path(__file__).parent
SPECS = HERE / "spec"
CACHE = HERE / "thumbs"
SHEETS = HERE / "sheets"

TILE_W, TILE_H, LABEL_H, COLS = 200, 150, 22, 10
UA = "flutter-native-play question tooling (https://github.com/devitsbeka/flutter-native-play)"


def fetch(url: str, dest: pathlib.Path) -> None:
    if dest.exists():
        return
    # Some files only offer the thumb sizes Commons pre-lists; fall back to
    # the verified 1280px URL when the 320px rewrite is refused.
    for candidate in (url.replace("/1280px-", "/320px-"), url):
        req = urllib.request.Request(candidate, headers={"User-Agent": UA})
        # A hundred requests as fast as the loop can issue them earns a 429,
        # and a 429 here is indistinguishable from a dead file: the tile comes
        # out pink and the reviewer is told an image is broken when it is
        # fine. Back off and ask again instead.
        for attempt in range(5):
            try:
                with urllib.request.urlopen(req, timeout=30) as r:
                    dest.write_bytes(r.read())
                time.sleep(0.4)
                return
            except urllib.error.HTTPError as exc:
                if exc.code == 429:
                    time.sleep(3 * (attempt + 1))
                    continue
                if exc.code != 400 or candidate == url:
                    raise
                break


def main() -> None:
    CACHE.mkdir(exist_ok=True)
    SHEETS.mkdir(exist_ok=True)
    slugs = sys.argv[1:] or [p.stem for p in sorted(SPECS.glob("*.json"))]
    for slug in slugs:
        entries = json.loads((SPECS / f"{slug}.json").read_text())
        rows = (len(entries) + COLS - 1) // COLS
        sheet = Image.new("RGB", (COLS * TILE_W, rows * (TILE_H + LABEL_H)), "white")
        draw = ImageDraw.Draw(sheet)
        for i, e in enumerate(entries):
            dest = CACHE / f"{slug}-{e['key']}"
            try:
                fetch(e["image"], dest)
                raw = Image.open(dest)
                if raw.mode in ("RGBA", "LA", "P"):
                    # Composite transparency over white — the same light
                    # ground the quiz card gives images — so the sheet shows
                    # what the player will see (and a white-on-transparent
                    # mark shows up here as a blank tile, which is the bug
                    # we are looking for).
                    rgba = raw.convert("RGBA")
                    im = Image.new("RGB", rgba.size, "white")
                    im.paste(rgba, mask=rgba.split()[3])
                else:
                    im = raw.convert("RGB")
                im.thumbnail((TILE_W - 8, TILE_H - 8))
            except Exception as exc:  # noqa: BLE001 — a broken thumb must be visible
                im = Image.new("RGB", (TILE_W - 8, TILE_H - 8), "#ffcccc")
                print(f"  ! {slug}/{e['key']}: {exc}")
            x = (i % COLS) * TILE_W
            y = (i // COLS) * (TILE_H + LABEL_H)
            sheet.paste(im, (x + (TILE_W - im.width) // 2, y + (TILE_H - im.height) // 2))
            draw.text((x + 4, y + TILE_H + 4), f"{i+1}. {e['answers']['en'][:24]}", fill="black")
        out = SHEETS / f"{slug}.png"
        sheet.save(out)
        print(f"{slug}: {len(entries)} tiles -> {out}")


if __name__ == "__main__":
    main()

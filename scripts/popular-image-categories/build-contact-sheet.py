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
    req = urllib.request.Request(url.replace("/1280px-", "/320px-"), headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        dest.write_bytes(r.read())


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
                im = Image.open(dest).convert("RGB")
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

#!/usr/bin/env python3
"""Lay the downloaded thumbnails out in sheets so they can be looked at.

Run:  python3 scripts/image-questions-ka/build-contact-sheet.py

Each cell is the card's own image box — quiz-question-card.tsx renders
`w-full h-36 object-contain object-top`, so 144px tall with the image fitted
inside and pinned to the top. A photograph that reads fine at full size can be
unidentifiable there, which is the whole point of looking.

Writes sheets/sheet-N.png, twenty questions each, numbered to match
resolved.json.
"""

import json
import pathlib
import sys

from PIL import Image, ImageDraw

HERE = pathlib.Path(__file__).parent
THUMBS = HERE / "thumbs"
SHEETS = HERE / "sheets"

# The card box, doubled so the sheet stays readable when scaled down.
CELL_W, CELL_H = 512, 288
COLS, ROWS = 4, 5
PAD = 28  # room for the number strip under each cell

resolved = json.loads((HERE / "resolved.json").read_text())

# Optional: build a sheet of just these indices, for re-checking the handful
# that changed rather than looking at all hundred again.
if len(sys.argv) > 1:
    wanted = {int(a) for a in sys.argv[1:]}
    resolved = [q for q in resolved if q["index"] in wanted]

SHEETS.mkdir(exist_ok=True)

per_sheet = COLS * ROWS
sheets = 0
for start in range(0, len(resolved), per_sheet):
    batch = resolved[start : start + per_sheet]
    sheet = Image.new("RGB", (COLS * CELL_W, ROWS * (CELL_H + PAD)), "white")
    draw = ImageDraw.Draw(sheet)
    for n, q in enumerate(batch):
        col, row = n % COLS, n // COLS
        x, y = col * CELL_W, row * (CELL_H + PAD)
        src = THUMBS / f"{q['index']:03d}.jpg"
        img = Image.open(src)
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGBA")
            flat = Image.new("RGBA", img.size, "white")
            img = Image.alpha_composite(flat, img).convert("RGB")
        else:
            img = img.convert("RGB")
        # object-contain: fit inside the box, keep the aspect ratio
        img.thumbnail((CELL_W, CELL_H))
        box = Image.new("RGB", (CELL_W, CELL_H), "#f3f4f6")
        box.paste(img, ((CELL_W - img.width) // 2, 0))  # object-top
        sheet.paste(box, (x, y))
        draw.rectangle([x, y, x + CELL_W - 1, y + CELL_H + PAD - 1], outline="#d1d5db")
        draw.text((x + 8, y + CELL_H + 7), f"{q['index']:03d}  {q['wiki'][:52]}", fill="#111827")
    out = SHEETS / f"sheet-{start // per_sheet + 1}.png"
    sheet.save(out, optimize=True)
    sheets += 1
    print(f"{out.relative_to(HERE.parent.parent)}  ({len(batch)} questions)")

print(f"\n{sheets} sheets covering {len(resolved)} questions")

"""
Builds scripts/words-levels/common-<lang>.txt for one language: the words
the level generator may use, most common first.

  python3 scripts/words-levels/filter-language.py <lang> <freq.txt> <dictionary.dic> <dictionary.aff> [ka-lemmas.txt]

Input is a frequency list ("word count" per line — hermitdave/FrequencyWords,
built from OpenSubtitles) and a Hunspell dictionary (wooorm/dictionaries).
Subtitle frequency lists carry typos, names and fragments, so a word is kept
only when the dictionary accepts it. Every kept word is then written in the
form the board uses: upper case, with the language's letter rules applied
(see `normalise`), and de-duplicated on that form.

Needs `spylls` (pip install spylls), a pure-Python Hunspell.
"""

import re
import sys
import unicodedata

from spylls.hunspell import Dictionary

lang, freq_path, dic_path, aff_path = sys.argv[1:5]

# Which characters may appear in a word, per language, before normalising.
ALPHABET = {
    "es": "a-záéíóúüñ",
    "fr": "a-zàâäçéèêëîïôöùûüÿœæ",
    "de": "a-zäöüß",
    "it": "a-zàèéìíîòóùú",
    "pt": "a-zàáâãçéêíóôõú",
    "ka": "ა-ჿ",
}[lang]
PATTERN = re.compile(f"^[{ALPHABET}]{{3,9}}$")


def normalise(word: str) -> str:
    """The form a player spells on the wheel."""
    if lang == "ka":
        return word
    if lang == "de":
        # Umlauts are letters of their own on a German board; ß is spelled SS.
        return word.replace("ß", "ss").upper()
    # Romance languages: accents fall away, the way crossword and word-wheel
    # games in those languages play them (café → CAFE). œ/æ expand.
    word = word.replace("œ", "oe").replace("æ", "ae")
    stripped = "".join(
        ch for ch in unicodedata.normalize("NFD", word) if unicodedata.category(ch) != "Mn"
    )
    return stripped.upper()


dictionary = Dictionary.from_files(dic_path.rsplit(".", 1)[0])

# Headwords only. A Hunspell dictionary accepts every inflection its affix
# rules can build, and a board of "tengo / oyes / ihnen / dalle" is a board
# of conjugations and case endings, not words. The .dic file lists the
# stems; only those (lower-case ones — a capitalised stem is a name) may
# play. German nouns are capitalised stems and are let through by hand.
stems = set()
for line in open(dic_path, encoding="utf-8", errors="ignore"):
    stem = line.split("/")[0].split("\t")[0].strip()
    if not stem or stem.isdigit():
        continue
    if lang == "de":
        if stem[0].isupper() and not stem.isupper():
            stems.add(stem.lower())  # a noun
        elif stem.islower():
            stems.add(stem)
    elif stem.islower():
        stems.add(stem)

# Georgian's Hunspell lists inflected forms as stems, so it cannot tell a
# headword from a case ending. Wiktionary can: the lemma list (built from
# kaikki.org's extract, names and inflections excluded) is the gate there.
lemmas = None
if lang == "ka":
    lemmas = set(w.strip() for w in open(sys.argv[5], encoding="utf-8") if w.strip())

kept = []
seen = set()
for line in open(freq_path, encoding="utf-8"):
    parts = line.split()
    if len(parts) != 2:
        continue
    word = parts[0]
    if not PATTERN.match(word):
        continue
    if lemmas is not None:
        # Georgian: a Wiktionary lemma. The frequency file is the app's own
        # questions; lemmas it never uses are appended after the loop.
        if word not in lemmas:
            continue
    elif word not in stems or int(parts[1]) < 30:
        # A headword, and one the subtitles use at least a few dozen times —
        # below that the list is abbreviations and typos the dictionary
        # happens to carry ("nro", "seo").
        continue
    form = normalise(word)
    if not 3 <= len(form) <= 7 or form in seen:
        continue
    # The dictionary decides. A word the checker only accepts capitalised is
    # a name, and the frequency list has lower-cased it — those fall out here.
    # German nouns are capitalised, and the frequency list lower-cases
    # everything — so a German word may pass as itself or capitalised.
    if not dictionary.lookup(word) and not (lang == "de" and dictionary.lookup(word.capitalize())):
        continue
    seen.add(form)
    kept.append(form)
    if len(kept) >= 14000:
        break

# Everything up to here is a word people meet — in the app's questions, in
# everyday speech — and may be asked for on the board. What follows the
# cutoff is only ever a bonus word.
board_cutoff = min(len(kept), 5000)
if lemmas is not None:
    # The rest of the Georgian lemma list, rarest last: shorter words first,
    # since a short real word is likelier to be known than a long rare one.
    tail = sorted((w for w in lemmas if w not in seen and 3 <= len(w) <= 7), key=lambda w: (len(w), w))
    kept.extend(tail)

out = f"scripts/words-levels/common-{lang}.txt"
with open(out, "w", encoding="utf-8") as f:
    f.write(f"# board-cutoff {board_cutoff}\n")
    f.write("\n".join(kept) + "\n")
print(lang, "kept", len(kept), "->", out)

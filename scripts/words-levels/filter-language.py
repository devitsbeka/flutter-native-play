"""
Builds scripts/words-levels/common-<lang>.txt for one language: the words
the level generator may use, most common first.

  python3 scripts/words-levels/filter-language.py <lang> <freq.txt> <dictionary.dic> <dictionary.aff>

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

kept = []
seen = set()
for line in open(freq_path, encoding="utf-8"):
    parts = line.split()
    if len(parts) != 2:
        continue
    word = parts[0]
    if not PATTERN.match(word):
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

out = f"scripts/words-levels/common-{lang}.txt"
with open(out, "w", encoding="utf-8") as f:
    f.write("\n".join(kept) + "\n")
print(lang, "kept", len(kept), "->", out)

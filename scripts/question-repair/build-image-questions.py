#!/usr/bin/env python3
"""Build photo questions: an image, four answers, no visible question text.

The game already supports this. quiz-question-card.tsx takes hideQuestionText,
and every gameplay surface passes `hideQuestionText={!!image_url}` — so a row
with an image_url renders as the picture and four buttons, nothing else.

question_text is still written, for two reasons: the column is NOT NULL, and
the card falls back to showing the text if the image fails to load
(`effectiveHideText = hideQuestionText && !imageFailed`). A player on a bad
connection gets a working question instead of four buttons and no prompt, so
the fallback has to read sensibly on its own.

Images come from Wikipedia's lead image for the subject, which is what the 292
existing photo questions already hotlink. Every URL is fetched and checked
before it is written out — a made-up Wikimedia path returns 404 and silently
degrades the question to text-only.
"""
import json, subprocess, sys, time, urllib.parse

CATEGORIES = {
    'animals':   '9e7ed994-2920-4a9e-b25a-cc97b15cf1bd',
    'geography': 'b352d1cf-a825-48a3-b85b-b916368669a3',
    'art':       'd0ac21f1-f19f-4fdb-8582-265d9c6c00ae',
    'people':    'c38e0f1f-3325-4027-be2f-dcb253985096',
    'architecture': '5e49f995-e562-42fa-a452-9a38ee8efeb0',
}

# (wikipedia page, category, fallback question, correct, [3 distractors])
SUBJECTS = [
    # ── animals ───────────────────────────────────────────────────────────
    ("Red panda", 'animals', "Which animal is shown?", "Red panda", ["Raccoon", "Fox", "Marten"]),
    ("Axolotl", 'animals', "Which animal is shown?", "Axolotl", ["Newt", "Salamander", "Mudpuppy"]),
    ("Narwhal", 'animals', "Which animal is shown?", "Narwhal", ["Beluga", "Porpoise", "Dolphin"]),
    ("Okapi", 'animals', "Which animal is shown?", "Okapi", ["Zebra", "Antelope", "Tapir"]),
    ("Pangolin", 'animals', "Which animal is shown?", "Pangolin", ["Armadillo", "Anteater", "Echidna"]),
    ("Capybara", 'animals', "Which animal is shown?", "Capybara", ["Beaver", "Nutria", "Groundhog"]),
    ("Toucan", 'animals', "Which bird is shown?", "Toucan", ["Hornbill", "Puffin", "Macaw"]),
    ("Chameleon", 'animals', "Which animal is shown?", "Chameleon", ["Gecko", "Iguana", "Skink"]),
    ("Manatee", 'animals', "Which animal is shown?", "Manatee", ["Walrus", "Seal", "Dugong"]),
    ("Puffin", 'animals', "Which bird is shown?", "Puffin", ["Penguin", "Auk", "Tern"]),
    ("Meerkat", 'animals', "Which animal is shown?", "Meerkat", ["Mongoose", "Prairie dog", "Ferret"]),
    ("Platypus", 'animals', "Which animal is shown?", "Platypus", ["Otter", "Beaver", "Echidna"]),
    ("Flamingo", 'animals', "Which bird is shown?", "Flamingo", ["Heron", "Stork", "Ibis"]),
    ("Sloth", 'animals', "Which animal is shown?", "Sloth", ["Koala", "Lemur", "Loris"]),
    ("Hedgehog", 'animals', "Which animal is shown?", "Hedgehog", ["Porcupine", "Shrew", "Mole"]),

    # ── landmarks and geography ───────────────────────────────────────────
    ("Eiffel Tower", 'geography', "Which landmark is shown?", "Eiffel Tower", ["Blackpool Tower", "Tokyo Tower", "Petrin Tower"]),
    ("Colosseum", 'geography', "Which landmark is shown?", "Colosseum", ["Pula Arena", "Arles Amphitheatre", "Verona Arena"]),
    ("Taj Mahal", 'geography', "Which landmark is shown?", "Taj Mahal", ["Humayun's Tomb", "Badshahi Mosque", "Bibi Ka Maqbara"]),
    ("Machu Picchu", 'geography', "Which landmark is shown?", "Machu Picchu", ["Chichen Itza", "Tikal", "Choquequirao"]),
    ("Christ the Redeemer", 'geography', "Which landmark is shown?", "Christ the Redeemer", ["Cristo de la Concordia", "Christ of Havana", "Christ the King"]),
    ("Golden Gate Bridge", 'geography', "Which bridge is shown?", "Golden Gate Bridge", ["Brooklyn Bridge", "Bay Bridge", "Mackinac Bridge"]),
    ("Stonehenge", 'geography', "Which landmark is shown?", "Stonehenge", ["Avebury", "Callanish Stones", "Carnac Stones"]),
    ("Petra", 'geography', "Which landmark is shown?", "Petra", ["Abu Simbel", "Ellora Caves", "Hegra"]),
    ("Neuschwanstein Castle", 'geography', "Which castle is shown?", "Neuschwanstein", ["Hohenzollern", "Pena Palace", "Bran Castle"]),
    ("Sydney Opera House", 'geography', "Which building is shown?", "Sydney Opera House", ["Oslo Opera House", "Esplanade", "Elbphilharmonie"]),
    ("Mount Fuji", 'geography', "Which mountain is shown?", "Mount Fuji", ["Mount Rainier", "Mount Ararat", "Mount Mayon"]),
    ("Matterhorn", 'geography', "Which mountain is shown?", "Matterhorn", ["Mount Assiniboine", "Ama Dablam", "Eiger"]),
    ("Angkor Wat", 'geography', "Which temple is shown?", "Angkor Wat", ["Borobudur", "Prambanan", "Bagan"]),
    ("Moai", 'geography', "What are these statues?", "Moai", ["Olmec heads", "Buddhas of Bamiyan", "Terracotta Army"]),
    ("Uluru", 'geography', "Which landmark is shown?", "Uluru", ["Kata Tjuta", "Devils Tower", "Table Mountain"]),

    # ── art ───────────────────────────────────────────────────────────────
    ("The Starry Night", 'art', "Which painting is shown?", "The Starry Night", ["Irises", "Wheatfield with Crows", "Cafe Terrace at Night"]),
    ("The Scream", 'art', "Which painting is shown?", "The Scream", ["Anxiety", "Despair", "The Dance of Life"]),
    ("Girl with a Pearl Earring", 'art', "Which painting is shown?", "Girl with a Pearl Earring", ["The Milkmaid", "The Lacemaker", "Study of a Young Woman"]),
    ("The Great Wave off Kanagawa", 'art', "Which print is shown?", "The Great Wave", ["Red Fuji", "Rainstorm Beneath the Summit", "Ejiri in Suruga"]),
    ("American Gothic", 'art', "Which painting is shown?", "American Gothic", ["The Midnight Ride", "Daughters of Revolution", "Stone City"]),
    ("The Birth of Venus", 'art', "Which painting is shown?", "The Birth of Venus", ["Primavera", "Venus and Mars", "Pallas and the Centaur"]),
    ("The Kiss (Klimt)", 'art', "Which painting is shown?", "The Kiss", ["Danae", "Judith and Holofernes", "The Tree of Life"]),
    ("Mona Lisa", 'art', "Which painting is shown?", "Mona Lisa", ["La Belle Ferronniere", "Lady with an Ermine", "Ginevra de' Benci"]),
    ("The Night Watch", 'art', "Which painting is shown?", "The Night Watch", ["The Anatomy Lesson", "The Syndics", "The Jewish Bride"]),
    ("The Garden of Earthly Delights", 'art', "Which painting is shown?", "Garden of Delights", ["The Last Judgment", "The Haywain Triptych", "The Temptation"]),

    # ── architecture ──────────────────────────────────────────────────────
    ("Sagrada Família", 'architecture', "Which building is shown?", "Sagrada Familia", ["Casa Mila", "Palau de la Musica", "Cologne Cathedral"]),
    ("Guggenheim Museum Bilbao", 'architecture', "Which museum is shown?", "Guggenheim Bilbao", ["Walt Disney Hall", "Dancing House", "MAXXI Museum"]),
    ("Burj Khalifa", 'architecture', "Which skyscraper is shown?", "Burj Khalifa", ["Shanghai Tower", "Taipei 101", "One World Trade"]),
    ("Fallingwater", 'architecture', "Which house is shown?", "Fallingwater", ["Villa Savoye", "Farnsworth House", "Glass House"]),
    ("Hagia Sophia", 'architecture', "Which building is shown?", "Hagia Sophia", ["Blue Mosque", "Suleymaniye Mosque", "St Mark's Basilica"]),

    # ── famous people ─────────────────────────────────────────────────────
    ("Albert Einstein", 'people', "Who is shown?", "Albert Einstein", ["Niels Bohr", "Max Planck", "Erwin Schrodinger"]),
    ("Frida Kahlo", 'people', "Who is shown?", "Frida Kahlo", ["Diego Rivera", "Remedios Varo", "Tina Modotti"]),
    ("Nelson Mandela", 'people', "Who is shown?", "Nelson Mandela", ["Desmond Tutu", "Kofi Annan", "Kwame Nkrumah"]),
    ("Marie Curie", 'people', "Who is shown?", "Marie Curie", ["Lise Meitner", "Rosalind Franklin", "Irene Joliot-Curie"]),
    ("Charlie Chaplin", 'people', "Who is shown?", "Charlie Chaplin", ["Buster Keaton", "Harold Lloyd", "Stan Laurel"]),
]

UA = 'MyTriviaQuestionBuilder/1.0 (contact: hello@itsbeka.com)'
# Wikimedia returns 429 when hit in a tight loop. One request every second or so
# is well inside what the API asks for, and the cache means a rerun after a
# failure does not spend the budget again on subjects that already resolved.
THROTTLE = 1.2
CACHE_PATH = 'image-cache.json'
try:
    CACHE = json.load(open(CACHE_PATH))
except (FileNotFoundError, json.JSONDecodeError):
    CACHE = {}

def lead_image(title, attempts=4):
    """Wikipedia's lead image for a page — the same source the existing photo
    questions use. Returns a bare upload.wikimedia.org URL.

    Retries: the API occasionally returns an empty body through the proxy, and
    one blip should not drop a subject from the batch."""
    url = ('https://en.wikipedia.org/w/api.php?action=query&format=json'
           '&prop=pageimages&piprop=original&titles=' + urllib.parse.quote(title))
    if title in CACHE:
        return CACHE[title]
    for attempt in range(attempts):
        try:
            time.sleep(THROTTLE * (1 + attempt * 2))
            r = subprocess.run(['curl', '-s', '--retry', '3', '--retry-delay', '3',
                                '-H', f'User-Agent: {UA}', url],
                               capture_output=True, text=True, timeout=60)
            pages = json.loads(r.stdout).get('query', {}).get('pages', {})
            for p in pages.values():
                src = p.get('original', {}).get('source')
                if src:
                    CACHE[title] = src.split('?')[0]   # drop the API's tracking params
                    json.dump(CACHE, open(CACHE_PATH, 'w'))
                    return CACHE[title]
            return None                            # page exists, simply has no image
        except (json.JSONDecodeError, subprocess.TimeoutExpired):
            time.sleep(1.5 * (attempt + 1))
    return None

def check(url):
    """Confirm the URL really serves an image, and how big it is."""
    time.sleep(THROTTLE)
    r = subprocess.run(
        ['curl', '-sIL', '--retry', '3', '--retry-delay', '5', '--retry-all-errors',
         '-H', f'User-Agent: {UA}', '-o', '/dev/null',
         '-w', '%{http_code} %{content_type} %{size_download} %{url_effective}', url],
        capture_output=True, text=True, timeout=30)
    parts = r.stdout.split(' ', 3)
    code, ctype = parts[0], (parts[1] if len(parts) > 1 else '')
    return code == '200' and ctype.startswith('image/'), code, ctype

rows, failures = [], []
for title, cat, qtext, correct, wrong in SUBJECTS:
    src = lead_image(title)
    if not src:
        failures.append((title, 'no lead image')); continue
    try:
        ok, code, ctype = check(src)
    except subprocess.TimeoutExpired:
        ok, code, ctype = False, 'timeout', ''

    if not ok:
        failures.append((title, f'{code} {ctype}')); continue
    rows.append({
        'category_id': CATEGORIES[cat],
        'question_text': qtext,
        'correct_answer': correct,
        'incorrect_answers': wrong,
        'image_url': src,
        'subject': title,
    })
    print(f'  ok   {title:32s} {src[:74]}')

for t, why in failures:
    print(f'  FAIL {t:32s} {why}', file=sys.stderr)

json.dump(rows, open('image-questions.json', 'w'), ensure_ascii=False, indent=1)
print(f'\n{len(rows)} verified, {len(failures)} failed')

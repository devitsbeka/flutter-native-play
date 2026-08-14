#!/usr/bin/env python3
"""Build a batch of photo questions from a subjects file.

    python3 build-image-batch.py image-subjects-2.json image-questions-2.json

The tier-1 script had its subject table baked in. This one takes it as data, so
a new batch is a new JSON file rather than a new script, and every rule learned
from tier 1 applies automatically to whatever comes next.

What it enforces, and why each one exists:

**Commons only.** A film poster, an album cover or a TV promo shot on Wikipedia
is a *non-free* file, uploaded locally under fair use and served from
`/wikipedia/en/`. Hotlinking one into a shipping app is infringement, and the
API hands them over as readily as the free ones. Anything not under
`/wikipedia/commons/` is dropped, which is why this batch reaches cinema, TV
and music through actors, instruments, consoles and locations rather than
through cover art.

**960px thumbnails, batched 20 titles per request.** Several originals run to
tens of megabytes, and Wikimedia rate-limits: tier 1 lost 27 of 50 subjects to
429s that look exactly like dead URLs at the call site.

**A live 200 from the CDN**, recorded per row. A 404 or 403 fails the subject;
a 429 only marks it unverified, because the API only returns a thumbnail for a
file that exists.

**Aspect ratio**, kept from the API. The card renders into a strip about 2.4:1,
so landscape fills it and portrait does not. Reported, not rejected — a
portrait painting is portrait, and the card fills the rest with a blurred copy.
"""
import json, subprocess, sys, time, urllib.parse

SUBJECTS_PATH = sys.argv[1] if len(sys.argv) > 1 else 'image-subjects-2.json'
OUT_PATH = sys.argv[2] if len(sys.argv) > 2 else 'image-questions-2.json'
CACHE_PATH = OUT_PATH.replace('.json', '-thumbs.json')

UA = 'MyTriviaQuestionBuilder/1.0 (contact: hello@itsbeka.com)'
BATCH = 20              # api.php takes up to 50 titles; 20 keeps each URL short
THUMB_PX = 960
PORTRAIT_BELOW = 1.2
FREE_PREFIX = 'https://upload.wikimedia.org/wikipedia/commons/'

spec = json.load(open(SUBJECTS_PATH))
CATEGORIES, SUBJECTS = spec['categories'], spec['subjects']
OVERRIDE = spec.get('image_override', {})

try:
    CACHE = json.load(open(CACHE_PATH))
except (FileNotFoundError, json.JSONDecodeError):
    CACHE = {}


def fetch_thumbs(titles):
    """Resolve page titles to 960px thumbnails, 20 per request.

    The API rewrites titles twice on the way in — `normalized` for whitespace
    and case, `redirects` for a page that moved — so the reply has to be mapped
    back to the title that was asked for or nothing matches the subjects file.
    """
    todo = [t for t in titles if t not in CACHE]
    for i in range(0, len(todo), BATCH):
        chunk = todo[i:i + BATCH]
        url = ('https://en.wikipedia.org/w/api.php?action=query&format=json'
               '&redirects=1&prop=pageimages&piprop=thumbnail'
               f'&pithumbsize={THUMB_PX}&titles='
               + urllib.parse.quote('|'.join(chunk), safe=''))
        q = None
        for attempt in range(4):
            try:
                r = subprocess.run(['curl', '-s', '--retry', '3', '--retry-delay', '3',
                                    '-H', f'User-Agent: {UA}', url],
                                   capture_output=True, text=True, timeout=90)
                q = json.loads(r.stdout).get('query', {})
                break
            except (json.JSONDecodeError, subprocess.TimeoutExpired):
                time.sleep(3 * (attempt + 1))
        if q is None:
            print(f'  batch of {len(chunk)} unresolved', file=sys.stderr)
            continue
        back = {n['to']: n['from'] for n in q.get('normalized', [])}
        back.update({n['to']: n['from'] for n in q.get('redirects', [])})
        for p in q.get('pages', {}).values():
            title = p.get('title')
            while title in back:
                title = back[title]
            thumb = p.get('thumbnail', {})
            if thumb.get('source'):
                CACHE[title] = {'url': thumb['source'].split('?')[0],
                                'w': thumb.get('width'), 'h': thumb.get('height')}
        json.dump(CACHE, open(CACHE_PATH, 'w'), ensure_ascii=False, indent=1)
        time.sleep(2)


def check(url, attempts=4):
    """Best-effort live 200. A 429 means busy, not broken — see the docstring."""
    code = '?'
    for attempt in range(attempts):
        time.sleep(2 + attempt * 4)
        try:
            r = subprocess.run(
                ['curl', '-sIL', '-H', f'User-Agent: {UA}', '-o', '/dev/null',
                 '-w', '%{http_code} %{content_type}', url],
                capture_output=True, text=True, timeout=45)
        except subprocess.TimeoutExpired:
            code = 'timeout'
            continue
        parts = r.stdout.split(' ', 1)
        code, ctype = parts[0], (parts[1] if len(parts) > 1 else '')
        if code == '200' and ctype.startswith('image/'):
            return 'ok', code
        if code in ('429', 'timeout'):
            time.sleep(20)
            continue
        return 'dead', code
    return 'unverified', code


CACHE.update({k: {'url': v, 'w': None, 'h': None} for k, v in OVERRIDE.items()})
fetch_thumbs([s[0] for s in SUBJECTS])

rows, failures = [], []
for title, cat, stem, correct, wrong in SUBJECTS:
    entry = CACHE.get(title)
    if not entry:
        failures.append((title, 'no thumbnail')); continue
    src = entry['url']
    if not src.startswith(FREE_PREFIX):
        failures.append((title, 'non-free file — not on Commons')); continue
    verdict, code = check(src)
    if verdict == 'dead':
        failures.append((title, code)); continue
    rows.append({
        'category_id': CATEGORIES[cat],
        'category': cat,
        'question_text': stem,
        'correct_answer': correct,
        'incorrect_answers': wrong,
        'image_url': src,
        'subject': title,
        'cdn_verified': verdict == 'ok',
        'aspect': round(entry['w'] / entry['h'], 2) if entry.get('w') and entry.get('h') else None,
    })
    print(f"  {verdict:10s} {cat:9s} {title:34s} {src[:52]}", flush=True)
    json.dump(rows, open(OUT_PATH, 'w'), ensure_ascii=False, indent=1)

for t, why in failures:
    print(f'  FAIL {t:34s} {why}', file=sys.stderr)

portrait = [r for r in rows if r['aspect'] and r['aspect'] < PORTRAIT_BELOW]
if portrait:
    print(f'\n{len(portrait)} portrait or near-square:', file=sys.stderr)
    for r in sorted(portrait, key=lambda r: r['aspect']):
        print(f"  {r['aspect']:.2f}  {r['subject']}", file=sys.stderr)

live = sum(1 for r in rows if r['cdn_verified'])
print(f'\n{len(rows)} rows, {live} confirmed live, '
      f'{len(rows) - live} rate-limited, {len(failures)} failed')

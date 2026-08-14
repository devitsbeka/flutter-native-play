#!/usr/bin/env python3
"""Re-verify the subjects `build-image-questions.py` dropped.

Every failure in the first run was a 429 from upload.wikimedia.org, not a bad
URL — the lead-image lookup had already succeeded for 49 of the 50 subjects and
is cached, so the only thing left to do is re-check the images at a pace
Wikimedia accepts. A HEAD every 4 seconds, with a 30 s cool-off after a 429,
gets the whole remainder through.

Merges into image-questions.json rather than rewriting it, so the 22 subjects
that already passed are not re-fetched.
"""
import json, subprocess, sys, time

sys.path.insert(0, '.')
UA = 'MyTriviaQuestionBuilder/1.0 (contact: hello@itsbeka.com)'

# Reuse the subject table from the builder without running its fetch loop.
src_text = open('build-image-questions.py').read()
ns = {}
exec(src_text[src_text.index('CATEGORIES = {'):src_text.index('UA =')], ns)
CATEGORIES, SUBJECTS = ns['CATEGORIES'], ns['SUBJECTS']

cache = json.load(open('image-cache.json'))
rows = json.load(open('image-questions.json'))
have = {r['subject'] for r in rows}

def check(url, attempts=6):
    for attempt in range(attempts):
        time.sleep(4 + attempt * 6)
        try:
            r = subprocess.run(
                ['curl', '-sIL', '-H', f'User-Agent: {UA}', '-o', '/dev/null',
                 '-w', '%{http_code} %{content_type}', url],
                capture_output=True, text=True, timeout=45)
        except subprocess.TimeoutExpired:
            code = 'timeout'
            continue
        parts = r.stdout.split(' ', 1)
        code = parts[0]
        ctype = parts[1] if len(parts) > 1 else ''
        if code == '200' and ctype.startswith('image/'):
            return True, code
        if code == '429':
            time.sleep(30)
    return False, code

still_failing = []
for title, cat, qtext, correct, wrong in SUBJECTS:
    if title in have:
        continue
    src = cache.get(title)
    if not src:
        still_failing.append((title, 'no lead image')); continue
    ok, code = check(src)
    if not ok:
        still_failing.append((title, code)); continue
    rows.append({
        'category_id': CATEGORIES[cat],
        'question_text': qtext,
        'correct_answer': correct,
        'incorrect_answers': wrong,
        'image_url': src,
        'subject': title,
    })
    print(f'  ok   {title:32s} {src[:70]}', flush=True)
    json.dump(rows, open('image-questions.json', 'w'), ensure_ascii=False, indent=1)

for t, why in still_failing:
    print(f'  FAIL {t:32s} {why}', file=sys.stderr)
print(f'\n{len(rows)} verified, {len(still_failing)} still failing')

#!/usr/bin/env python3
"""Emit the INSERT for the photo questions, staged in the Library.

Not straight to production: these are the first English photo questions in the
bank, and the one thing that cannot be checked from here is whether the picture
actually reads as its answer at phone size. A lead image is the article's
main image, not necessarily a clean portrait — so they land in the Library with
`in_production = false` for one pass through Question Studio, exactly like the
repaired text questions did.

Re-running the file is safe: the WHERE NOT EXISTS clause keys on image_url, so
a second run inserts nothing rather than a second copy of all 50.
"""
import json, sys

# Difficulty is a play-balance call, not a fact about the image. Subjects a
# general audience recognises on sight are easy; the rest sit at medium, which
# is also the column default.
EASY = {
    'Eiffel Tower', 'Colosseum', 'Taj Mahal', 'Machu Picchu',
    'Christ the Redeemer (statue)', 'Golden Gate Bridge', 'Stonehenge',
    'Sydney Opera House', 'Mount Fuji', 'Matterhorn',
    'The Starry Night', 'The Scream', 'Mona Lisa', 'The Great Wave off Kanagawa',
    'Burj Khalifa', 'Hagia Sophia',
    'Albert Einstein', 'Nelson Mandela', 'Charlie Chaplin', 'Marie Curie',
    'Flamingo', 'Sloth', 'Hedgehog', 'Toucan', 'Chameleon', 'Platypus',
}

QUESTION_MAX = 70
ANSWER_MAX = 48


def q(s):
    return "'" + s.replace("'", "''") + "'"


rows = json.load(open('image-questions.json'))

problems = []
for r in rows:
    answers = [r['correct_answer']] + r['incorrect_answers']
    if len(r['question_text']) > QUESTION_MAX:
        problems.append(f"{r['subject']}: question {len(r['question_text'])} chars")
    if len(r['incorrect_answers']) != 3:
        problems.append(f"{r['subject']}: {len(r['incorrect_answers'])} distractors")
    if len({a.strip().lower() for a in answers}) != 4:
        problems.append(f"{r['subject']}: duplicate options")
    for a in answers:
        if len(a) > ANSWER_MAX:
            problems.append(f"{r['subject']}: answer {len(a)} chars — {a!r}")
    if not r['image_url'].startswith('https://upload.wikimedia.org/'):
        problems.append(f"{r['subject']}: unexpected image host")

seen = {}
for r in rows:
    seen.setdefault(r['image_url'], []).append(r['subject'])
for url, subjects in seen.items():
    if len(subjects) > 1:
        problems.append(f"same image for {subjects}")

if problems:
    for p in problems:
        print('  ' + p, file=sys.stderr)
    sys.exit(f'{len(problems)} problems — not emitting SQL')

live = sum(1 for r in rows if r.get('cdn_verified'))
out = [
    f'-- {len(rows)} English photo questions, staged in the Library.',
    '-- Every image_url came from the Wikipedia API, which only returns a',
    f'-- thumbnail for a file that exists. {live} of {len(rows)} were also',
    '-- fetched and confirmed to return 200 with an image content-type;',
    '-- the rest were rate-limited by the CDN at build time, not missing.',
    '',
    'INSERT INTO public.questions',
    '  (language, category_id, question_text, correct_answer, incorrect_answers,',
    '   image_url, difficulty, level_number, is_active, in_production)',
    'SELECT * FROM (VALUES',
]

values = []
for r in rows:
    difficulty = 'easy' if r['subject'] in EASY else 'medium'
    values.append(
        "  ('en', {cat}::uuid, {qt}, {ca}, {ia}::jsonb, {img}, {diff}, 1, true, false)".format(
            cat=q(r['category_id']),
            qt=q(r['question_text']),
            ca=q(r['correct_answer']),
            ia=q(json.dumps(r['incorrect_answers'], ensure_ascii=False)),
            img=q(r['image_url']),
            diff=q(difficulty),
        ))

out.append(',\n'.join(values))
out += [
    ') AS v(language, category_id, question_text, correct_answer,',
    '       incorrect_answers, image_url, difficulty, level_number,',
    '       is_active, in_production)',
    'WHERE NOT EXISTS (',
    '  SELECT 1 FROM public.questions p WHERE p.image_url = v.image_url',
    ');',
]

open('image-questions.sql', 'w').write('\n'.join(out) + '\n')
print(f'{len(rows)} rows -> image-questions.sql '
      f'({sum(1 for r in rows if r["subject"] in EASY)} easy, '
      f'{sum(1 for r in rows if r["subject"] not in EASY)} medium)')

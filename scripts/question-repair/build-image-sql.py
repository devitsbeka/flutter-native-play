#!/usr/bin/env python3
"""Emit the INSERT for a batch of photo questions, staged in the Library.

    python3 build-image-sql.py image-questions-2.json image-questions-2.sql [chunk_size]

Not straight to production: the one thing that cannot be checked from here is
whether the picture reads as its answer at phone size, so a batch lands with
`in_production = false` for one pass through Question Studio.

Re-running is safe. The WHERE NOT EXISTS keys on image_url **and language** —
scoped to English because the Georgian bank already hotlinks some of the same
Wikipedia lead images, and an unscoped guard silently swallowed five rows of
tier 1 before anyone noticed the count was short.

`chunk_size` splits the output into separately runnable statements. The Supabase
SQL editor truncated a 17 KB paste, so ten rows per statement is the size that
actually survives a copy.
"""
import json, sys

QUESTION_MAX = 70
ANSWER_MAX = 48

# Difficulty is a play-balance call, not a fact about the picture: subjects a
# general audience names on sight. Everything else sits at medium, which is
# also the column default.
EASY = {
    'Steven Spielberg', 'Quentin Tarantino', 'Marilyn Monroe', 'Bruce Lee',
    'Morgan Freeman', 'Hollywood Sign', 'Jennifer Aniston', 'Oprah Winfrey',
    'Cello', 'Trombone', 'Elton John', 'Snoop Dogg',
    'Nintendo Entertainment System', 'Game Boy', 'PlayStation 2', 'Nintendo 64',
    'Saturn', 'Jupiter', 'Mars', 'International Space Station',
    'Usain Bolt', 'Lionel Messi', 'Muhammad Ali', 'Roger Federer',
    'Sushi', 'Ramen', 'Taco', 'Croissant', 'Macaron',
    'Great Sphinx of Giza', 'Great Pyramid of Giza', 'Terracotta Army',
    'Mask of Tutankhamun', 'Parthenon',
    'Concorde', 'Typewriter', 'Floppy disk',
    'Kimono', 'Notre-Dame de Paris', 'Saint Basil\'s Cathedral',
    'Sea otter', 'Cherry blossom', 'Aurora',
    # tier 1
    'Eiffel Tower', 'Colosseum', 'Taj Mahal', 'Machu Picchu',
    'Christ the Redeemer (statue)', 'Golden Gate Bridge', 'Stonehenge',
    'Sydney Opera House', 'Mount Fuji', 'Matterhorn',
    'The Starry Night', 'The Scream', 'Mona Lisa', 'The Great Wave off Kanagawa',
    'Burj Khalifa', 'Hagia Sophia',
    'Albert Einstein', 'Nelson Mandela', 'The Tramp', 'Marie Curie',
    'Flamingo', 'Sloth', 'Hedgehog', 'Toco toucan', 'Chameleon', 'Platypus',
}


def q(s):
    return "'" + s.replace("'", "''") + "'"


in_path = sys.argv[1] if len(sys.argv) > 1 else 'image-questions.json'
out_path = sys.argv[2] if len(sys.argv) > 2 else 'image-questions.sql'
chunk = int(sys.argv[3]) if len(sys.argv) > 3 else 0

rows = json.load(open(in_path))

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
    if not r['image_url'].startswith('https://upload.wikimedia.org/wikipedia/commons/'):
        problems.append(f"{r['subject']}: not a Commons file")

seen = {}
for r in rows:
    seen.setdefault(r['image_url'], []).append(r['subject'])
for url, subjects in seen.items():
    if len(subjects) > 1:
        problems.append(f'same image for {subjects}')

if problems:
    for p in problems:
        print('  ' + p, file=sys.stderr)
    sys.exit(f'{len(problems)} problems — not emitting SQL')

HEAD = ('INSERT INTO public.questions (language,category_id,question_text,'
        'correct_answer,incorrect_answers,image_url,difficulty,level_number,'
        'is_active,in_production)\nSELECT * FROM (VALUES')
TAIL = ('\n) AS v(language,category_id,question_text,correct_answer,'
        'incorrect_answers,image_url,difficulty,level_number,is_active,in_production)\n'
        'WHERE NOT EXISTS (\n'
        '  SELECT 1 FROM public.questions p\n'
        "   WHERE p.image_url = v.image_url AND p.language = 'en'\n"
        ');')


def value(r):
    return ("  ('en',{cat}::uuid,{qt},{ca},{ia}::jsonb,{img},{d},1,true,false)".format(
        cat=q(r['category_id']), qt=q(r['question_text']), ca=q(r['correct_answer']),
        ia=q(json.dumps(r['incorrect_answers'])), img=q(r['image_url']),
        d=q('easy' if r['subject'] in EASY else 'medium')))


size = chunk or len(rows)
parts = []
for i in range(0, len(rows), size):
    body = ',\n'.join(value(r) for r in rows[i:i + size])
    parts.append(f'{HEAD}\n{body}{TAIL}')

if chunk:
    for n, part in enumerate(parts, 1):
        p = out_path.replace('.sql', f'-{n}.sql')
        open(p, 'w').write(part + '\n')
        print(f'{p}  {len(part)} chars')
else:
    open(out_path, 'w').write('\n\n'.join(parts) + '\n')
    print(f'{out_path}  {len(rows)} rows')

easy = sum(1 for r in rows if r['subject'] in EASY)
print(f'{len(rows)} rows: {easy} easy, {len(rows) - easy} medium')

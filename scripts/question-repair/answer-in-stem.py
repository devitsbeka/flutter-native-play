#!/usr/bin/env python3
"""Fix the questions whose stem contains their own correct answer.

Found by auditing production after the duplicate pass: 69 stems contain their
correct answer, but only 44 of them leak it. The other 25 are "which came
first, X or Y?" comparisons, where naming both sides is the question — those
are left alone, and so are the five polarity questions ("Is gold magnetic or
non-magnetic?") for the same reason.

Of the 44, seven have no question underneath the leak and are retired; the rest
get a stem that asks the same thing without saying the answer out loud.
"""
import json, sys

# No question survives removing the answer from these.
RETIRE = {
    # The shop in Black Books is called Black Books. Naming the series is
    # unavoidable, and it gives the answer away.
    '0d2bb675': 'the answer is the title named in the stem',
    # "Super Metroid" is one of the distractors and is also a correct answer.
    '7478aba4': 'two correct answers',
    # Removing "English" from "Oxford English Dictionary" leaves nothing.
    'a86decf5': 'the answer is inside the proper noun the question is about',
    # Alone in the Dark and Sweet Home both have real claims to the genre.
    'c8d11087': 'more than one defensible answer',
    # Distractors are truncated fragments: "Ocean carbon seq.", "Deforest. & biodiv."
    'e636522f': 'malformed distractors',
    # Duplicate of 89493955, which is the better-worded copy.
    '658941c3': 'duplicate',
    # Duplicate of eaa0d545, and "What is manga about Naruto called?" is circular.
    '93f72020': 'duplicate and circular',
}

# id -> stem that asks the same question without naming the answer.
REWRITE = {
    '0ff09084': "Which South Indian city is famous for its silk sarees?",
    '11076ce1': "Which Oscar-winning actor founded a major climate foundation?",
    '1a8de50e': "In Greek myth, who is Zagreus's father?",
    '1e74e4af': "Which word comes from the Greek for 'wanderer'?",
    '37a414d8': "Which German art forger faked lost Expressionist works?",
    '423768dc': "Which field drove the AI breakthroughs of the 2010s?",
    '4471a26e': "What lies between the orbits of Mars and Jupiter?",
    '4ea799cf': "What does the Mandela Effect describe?",
    '5c71b88a': "Who wrote Liber Abaci, introducing his famous sequence?",
    '6019ef23': "Which Norse god inspired a Marvel superhero directly?",
    '89493955': "Which meme shows escalating levels of enlightenment?",
    '6fa3e1f8': "Which video game adapts a board game about settling Mars?",
    '731e25f1': "Which game series is known for open worlds and car crime?",
    '7536fb3a': "Which arch type is the semicircle used in aqueducts?",
    '7766b59b': "Which Netflix series has players risk death in kids' games?",
    '839265f8': "Which Australian state is an island off the south coast?",
    'eaa0d545': "Which anime follows a young ninja of the Hidden Leaf?",
    '9ab46f11': "Which threat splits wildlife range into isolated patches?",
    'aa1db77f': "Which organization verifies and publishes record attempts?",
    'ac9a8395': "Which SI unit measures energy?",
    'ad226283': "Which showman played himself in a 1912 film of his life?",
    'ae3df1af': "Which 1999 Disney movie features a computer-run home?",
    'bc809a0d': "Which metal backed currencies under the classical standard?",
    'bfc2b271': "In which Spanish city is Camp Nou located?",
    'c6bd6231': "Which FOX series follows a young Jim Gordon's early cases?",
    'ddf6f4e0': "In which anime does Ash Ketchum catch monsters?",
    'e1597cfd': "Which German city gave its name to a beef patty?",
    'e235fe0d': "Where did the Pythia deliver Apollo's prophecies?",
    'e3af0eda': "Which event was read as an omen of a ruler's fall?",
    'f1f0b772': "Which part of an OS manages memory and hardware?",
    'fb185cb0': "Which animal's gallop inspired MIT's running robots?",
    'fd0fbfc4': "Which TV show follows a high school singing club?",
}

QUESTION_MAX = 70

rows = {json.loads(l)['id'][:8]: json.loads(l) for l in open(sys.argv[1])}

problems = []
for i, stem in REWRITE.items():
    r = rows.get(i)
    if not r:
        problems.append(f'{i}: not in production'); continue
    low = stem.lower()
    if r['correct_answer'].lower() in low:
        problems.append(f'{i}: still names the answer — {r["correct_answer"]!r}')
    for w in r['incorrect_answers']:
        if w.lower() in low:
            problems.append(f'{i}: names a distractor — {w!r}')
    if len(stem) > QUESTION_MAX:
        problems.append(f'{i}: {len(stem)} chars')
    if not stem.rstrip().endswith('?'):
        problems.append(f'{i}: no question mark')
for i in RETIRE:
    if i not in rows:
        problems.append(f'{i}: not in production')
if set(REWRITE) & set(RETIRE):
    problems.append(f'both rewritten and retired: {set(REWRITE) & set(RETIRE)}')

if problems:
    for p in problems:
        print('  ' + p, file=sys.stderr)
    sys.exit(f'{len(problems)} problems — not emitting SQL')


def q(s):
    return "'" + s.replace("'", "''") + "'"


out = [
    '-- Questions whose stem contained their own correct answer.',
    f'-- {len(REWRITE)} rewritten, {len(RETIRE)} retired.',
    '',
    'BEGIN;',
    '',
    'UPDATE public.questions AS t',
    '   SET original_question_text = COALESCE(t.original_question_text, t.question_text),',
    '       question_text = v.stem',
    '  FROM (VALUES',
]
out.append(',\n'.join(f'    ({q(i)}, {q(s)})' for i, s in REWRITE.items()))
out += [
    '  ) AS v(id8, stem)',
    ' WHERE t.language = \'en\' AND left(t.id::text, 8) = v.id8;',
    '',
    'UPDATE public.questions',
    "   SET is_active = false, in_production = false,",
    "       quality_status = 'retired_unfixable'",
    " WHERE language = 'en'",
    '   AND left(id::text, 8) IN (' + ', '.join(q(i) for i in RETIRE) + ');',
    '',
    'COMMIT;',
]

open('answer-in-stem.sql', 'w').write('\n'.join(out) + '\n')
print(f'{len(REWRITE)} rewrites + {len(RETIRE)} retires -> answer-in-stem.sql')

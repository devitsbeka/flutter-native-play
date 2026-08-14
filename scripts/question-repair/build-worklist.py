#!/usr/bin/env python3
"""Final work list: which duplicates to retire, which questions to rewrite.

Clustering runs in two stages because a single Jaccard threshold under-merges:
"How many bones are in an adult human body/skeleton?" and "How many bones adult
human have?" landed in three separate clusters. Stage 2 merges anything that
already agrees on the correct answer at a much looser word overlap.

Keeper choice is scored structurally, then overridden by hand where the score
would keep the factually wrong twin (the circle-area formula) or where the two
questions are not actually duplicates at all.
"""
import json, re, collections, unicodedata

rows = [json.loads(l) for l in open('en_raw.jsonl')]
by_id = {r['id']: r for r in rows}
prod = [r for r in rows if r.get('in_production')]

def opts(r):
    ia = r.get('incorrect_answers') or []
    if isinstance(ia, str): ia = json.loads(ia)
    return [str(r['correct_answer'])] + [str(x) for x in ia]

def same_option(s):
    """Compare option text for real duplication.

    Stripping all punctuation collapses whole families of legitimate answers
    into the same string: $/€/£/¥, ∃/∀/∧/∨, ☉/☾/♂/⊕, and every formula
    ("a² + b² = c²" and "a + b = c" both become "a b c"). Only leading and
    trailing punctuation is noise — "Grumpy Cat." and "Grumpy Cat" are the same
    answer. Everything inside the string carries meaning.
    """
    s = unicodedata.normalize('NFKC', str(s)).lower()
    s = re.sub(r'\s+', ' ', s).strip()
    return s.strip('.,;:!?\'"“”‘’ ')


def norm(s):
    """Flatten text for word overlap and substring tests, where punctuation is
    genuinely noise. Not for comparing options — see same_option."""
    s = unicodedata.normalize('NFKC', str(s)).lower()
    return re.sub(r'\s+', ' ', re.sub(r'[^\w\s]', ' ', s)).strip()

STOP = set('what which who whom whose when where why how the a an of in on for to is are was were did does do by with from that this these those it its as at or and actually really typically normally one at year'.split())
def words(s): return frozenset(w for w in norm(s).split() if len(w) > 2 and w not in STOP)

# Answer text that means the same thing across phrasings, so stage 2 can match.
NUMWORD = {'one':'1','two':'2','three':'3','four':'4','five':'5','six':'6','seven':'7',
           'eight':'8','nine':'9','ten':'10','twelve':'12','thirty two':'32'}
def answer_key(r):
    a = norm(r['correct_answer'])
    a = re.sub(r'\b(about|approximately|around|nearly|over|roughly)\b', '', a).strip()
    a = re.sub(r'\b(chambers?|teeth|bones?|moons?|hours?|players?|percent|muscles?)\b', '', a).strip()
    a = re.sub(r'\s+', ' ', a)
    for w, d in NUMWORD.items():
        if a == w: a = d
    a = a.replace('₂', '2').replace('²', '2')
    return a

# ── pairs whose members only LOOK like duplicates ─────────────────────────
PROTECT = {
    frozenset(('182761b1', '492bb178')),  # female vs male scientific symbol
    frozenset(('1b639059', '6bbc98bc')),  # solar flares: ionosphere vs technology
    frozenset(('332aa526', '7210b135')),  # first 3D vector arcade game vs first arcade game
    frozenset(('a12c25a3', 'b6df7ecb')),  # Dead Sea Scrolls: century vs year
    frozenset(('c1668875', 'a8ab09a8')),  # pi to 5 dp vs pi to 2 dp
    frozenset(('c1668875', '75ffc20f')),
    frozenset(('c1668875', '956154e5')),
}
def protected(a, b): return frozenset((a[:8], b[:8])) in PROTECT

# Two questions that differ by a RARE word are about different things, even when
# the wording overlaps and the answer agrees: "human heart" vs "giraffe's heart"
# both answer four, "Gosling created which language" vs "what year was C++
# created" share three of four content words. A word used in only a handful of
# questions across the bank is the subject, not filler — so if the symmetric
# difference contains one, refuse the merge. Being conservative here keeps a
# duplicate; being loose deletes a distinct question, which is the worse error.
RARE_DF = 6
DF = collections.Counter()

# ...except when the rare word only narrows or restates the same question rather
# than naming a different subject. "How many PERMANENT teeth does an adult human
# have?" and "How many teeth does an adult human have?" are one question; so are
# the pairs separated by "observable", "normal", "rounded", or a year. What must
# still block is a rare word that names a different thing — giraffe, Michelin,
# Gosling, C++ — so this list is curated by reading the pairs, not inferred.
QUALIFIER_WORDS = {
    'permanent', 'observable', 'weight', 'physicist', 'rounded', 'normal',
    'naked', 'intact', 'starting', 'lineup', 'astronaut', 'wisdom', 'incl',
    'approximately', 'exactly', 'roughly', 'officially', 'currently', 'known',
    'confirmed', 'total', 'average', 'adult', 'modern', 'famous', 'iconic',
    'entire', 'whole', 'single', 'overall', 'precise', 'scientific',
}
def is_qualifier(w):
    return w in QUALIFIER_WORDS or re.fullmatch(r'(1[5-9]|20)\d\d', w) is not None

# ── keeper overrides, decided by reading the pair ─────────────────────────
# Left = the id to keep, regardless of what the structural score prefers.
FORCE_KEEP = {
    'bfd47cb4',  # Vikings: "No, modern myth" beats the clipped "No arch. evidence"
    '146971a8',  # teeth: clean numeric options beat "32 teeth"/"28 teeth"
    'd502edc7',  # microgravity: clean distractors, no "signif."/"perm." clipping
    '601ef0a7',  # circle area: πr^2 is correct; the twin marks 2πr correct
    'b05fc333',  # Instagram: "Burbn" is correct; the twin says "Codename"
    'bfbe6021',  # UV vision: aphakia answer is correct; the twin says "impossible"
    'df304a6c',  # the one brain-10% question that survives
    '24cf93e1',  # speed of light in m/s
    'c272015c',  # Ohm's law as V = IR, the SI-standard symbol
}

# ── build clusters ────────────────────────────────────────────────────────
sig = [(r, words(r['question_text'])) for r in prod]
idx = collections.defaultdict(list)
for r, t in sig:
    for w in t: idx[w].append((r, t))
for _, t in sig: DF.update(t)

def distinct_subject(t1, t2):
    """True when the words that differ are rare enough to be the subject."""
    return any(DF[w] <= RARE_DF and not is_qualifier(w) for w in (t1 ^ t2))

parent = {}
def find(x):
    parent.setdefault(x, x)
    while parent[x] != x: parent[x] = parent[parent[x]]; x = parent[x]
    return x
def union(a, b):
    ra, rb = find(a), find(b)
    if ra != rb: parent[ra] = rb

def link(threshold, require_same_answer):
    for r, t in sig:
        if len(t) < 3: continue
        cand = collections.Counter()
        for w in t:
            if len(idx[w]) >= 300: continue
            for r2, _ in idx[w]:
                if r2['id'] != r['id']: cand[r2['id']] += 1
        for oid, _ in cand.most_common(10):
            r2, t2 = next((a, b) for a, b in sig if a['id'] == oid)
            if protected(r['id'], oid): continue
            if require_same_answer and answer_key(r) != answer_key(r2): continue
            if distinct_subject(t, t2): continue
            if len(t & t2) / len(t | t2) >= threshold:
                union(r['id'], oid)

link(0.70, False)   # stage 1: near-identical wording
link(0.45, True)    # stage 2: looser wording, but the answer already agrees

clusters = collections.defaultdict(list)
for qid in list(parent): clusters[find(qid)].append(qid)
clusters = {k: v for k, v in clusters.items() if len(v) > 1}

# What may appear in an English question, written as explicit code points
# because the literal ranges were unreadable and twice wrong. A chemistry
# formula, a degree sign or a calculus symbol is not a language leak; Georgian,
# Cyrillic and Arabic are.
NON_LATIN = re.compile(
    '[^'
    '\u0000-\u007f'   # ASCII
    '\u00a0-\u024f'   # Latin-1 supplement and Latin Extended: ° × ÷ ± é ñ
    '\u0370-\u03ff'   # Greek: π Σ Ω
    '\u1d00-\u1d7f'   # phonetic modifier letters: superscript a b
    '\u2000-\u206f'   # general punctuation: — “ ” ‘ ’ …
    '\u2070-\u209f'   # superscripts and subscripts: ⁻³¹ ₂ ₆
    '\u20a0-\u20bf'   # currency: € £ ¥ ₾
    '\u2100-\u214f'   # letterlike: ℃ ℉ №
    '\u2190-\u21ff'   # arrows
    '\u2200-\u22ff'   # maths operators: ∫ ∑ ∀ ∃ √ ≈
    '\u2300-\u23ff'   # misc technical
    '\u25a0-\u25ff'   # geometric shapes
    '\u2600-\u27bf'   # misc symbols: ☉ ☾ ♂ ⊕
    ']')

def score(r):
    o = opts(r); s = 0
    if len(o) == 4: s += 10
    if len(r['question_text']) <= 70: s += 5
    if max(len(a) for a in o) <= 20: s += 5
    if r['question_text'].strip().endswith('?'): s += 3
    if not NON_LATIN.search(' '.join(o)): s += 6
    if not re.search(r'\b(Fdn|Intl|Assoc|Dept|Cncl|Comm|Stk|Exch|signif|perm|arch)\.', ' '.join(o)): s += 3
    lens = [len(a) for a in o]
    if max(lens) - min(lens) <= 8: s += 2
    return s - len(r['question_text']) / 100

# Questions that are not duplicates but cannot be repaired by rewriting — the
# premise is invented, the answer is unverifiable, or more than one option is
# true. Retiring beats rewriting because there is no correct question underneath.
FORCE_RETIRE = {
    '0acb1e18': 'ambiguous: marked Iron Man, but both films are 2008 and "Same year" is offered',
    '1343aae1': 'arbitrary: no defensible "most common" ordering of difficulty levels',
    '3b2ba59b': 'invented premise: TikTok\'s algorithm does not model starling murmuration',
    '3d1c7e1a': 'multiple options true: the Met, Guggenheim and Tate all banned selfie sticks',
    '8982ce69': 'unverifiable quote attribution',
    '8b5298c7': 'false premise: the conflict in Tiger King is between people, not cats',
    'a5cc5ad0': 'unanswerable trivia: a single index\'s country count for one year',
    'cb44da4f': 'stale and self-defeating: answer is 35 since Feb 2025, and 35 is a distractor',
    'f3a221d6': 'wrong and nonsensical: aphakic people do see UV; "eye exercises" is not a real premise',
    'c15f9c15': 'same question as a7092f1a (most expensive dress at auction), with an "as of 2023" stamp',
    '1e270c9d': 'IMDb episode ratings move continuously; no answer stays right',
    '41747e0d': 'most-followed account on X changes; the answer dates immediately',
    '4c836800': "Voyager 1's distance grows every day, so any fixed figure is wrong",
    '46e3d657': 'invented programme name with real organisations as distractors',
    '3798e93b': 'shortest known exoplanet orbit is a moving record',
    '59cb5e50': 'self-answering in any phrasing: gold leaf is made of gold',
    '62f91b16': 'answer looks wrong — Cyberpunk: Edgerunners took Anime of the Year in 2023',
    '89e53f4b': 'the TOP500 number one changes every list; El Capitan has since passed Frontier',
}

retire = {}
for qid, why in FORCE_RETIRE.items():
    full = next((r['id'] for r in prod if r['id'][:8] == qid), None)
    if full: retire[full] = {'reason': 'unfixable', 'keeper': None, 'note': why}

for members in clusters.values():
    forced = [m for m in members if m[:8] in FORCE_KEEP]
    keeper = forced[0] if forced else sorted(members, key=lambda i: -score(by_id[i]))[0]
    conflict = len({answer_key(by_id[i]) for i in members}) > 1
    for loser in members:
        if loser == keeper: continue
        retire[loser] = {
            'reason': 'duplicate_conflicting' if conflict else 'duplicate',
            'keeper': keeper,
            'note': f'near-identical to {keeper[:8]}',
        }

# ── rewrite queue ─────────────────────────────────────────────────────────
# Scope: everything off the project's own 70/20 standard, not just what clips.
Q_BROKEN, A_BROKEN = 70, 20
rewrite = {}
for r in prod:
    if r['id'] in retire: continue
    o = opts(r); why = []
    if len(o) != 4: why.append(f'only_{len(o)}_options')
    if len({same_option(x) for x in o}) != len(o): why.append('duplicate_options')
    if NON_LATIN.search(' '.join(o) + r['question_text']): why.append('foreign_script')
    if len(r['question_text']) > Q_BROKEN: why.append(f"question_{len(r['question_text'])}ch")
    if max(len(a) for a in o) > A_BROKEN: why.append(f'answer_{max(len(a) for a in o)}ch')
    # An unbalanced answer set only gives the game away when the CORRECT answer
    # is the long one. "William Butler Yeats" against "T.S. Eliot" is unbalanced
    # and unfixable — the man's name is his name — but if the long option is a
    # distractor, nothing leaks. Only flag the leaking direction.
    lens = [len(a) for a in o]
    if len(o[0]) == max(lens) and len(o[0]) - sorted(lens)[-2] > 6:
        why.append(f'correct_longest_{len(o[0])}')
    if why: rewrite[r['id']] = why

json.dump({'retire': retire, 'rewrite': rewrite}, open('worklist.json', 'w'),
          ensure_ascii=False, indent=1)

print(f'clusters found      : {len(clusters)}')
print(f'RETIRE (duplicates) : {len(retire)}')
print(f'  conflicting       : {sum(1 for v in retire.values() if v["reason"]=="duplicate_conflicting")}')
print(f'  same answer       : {sum(1 for v in retire.values() if v["reason"]=="duplicate")}')
print(f'REWRITE             : {len(rewrite)}')
c = collections.Counter(w.split("_")[0] for v in rewrite.values() for w in v)
for k, n in c.most_common(): print(f'   {n:5d}  {k}')
print(f'\nsurvivors in production: {len(prod) - len(retire)}')

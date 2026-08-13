#!/usr/bin/env python3
"""Meaning-preserving trims, applied only when they are provably safe.

Most over-length answers in this bank are verbose in the same way across all
four options — every option repeats the noun already in the question ("Four
chambers", "Three chambers"), or shares a long stem ("The escape velocity is
..."), or carries a hedge nobody needs ("About 60 percent"). Those are
mechanical, and doing them by rule leaves the questions that genuinely need
judgement for a human.

The safety rule throughout: a trim only fires when it applies to ALL FOUR
options. Removing a word from one option but not the others changes which
answer stands out, which is exactly the giveaway this pass is supposed to
remove. If a rule cannot fire on the whole set, it does not fire at all.

Output goes to trimmed.jsonl in the same shape as rewrites.jsonl. Whatever is
left over is printed as the queue that still needs a person.
"""
import json, re, sys, collections, unicodedata

Q_MAX, A_MAX, SPREAD = 70, 20, 8

rows = [json.loads(l) for l in open('en_raw.jsonl')]
by_id = {r['id']: r for r in rows}
wl = json.load(open('worklist.json'))
already = {json.loads(l)['id'] for l in open('rewrites.jsonl') if l.strip()}

def opts(r):
    ia = r.get('incorrect_answers') or []
    if isinstance(ia, str): ia = json.loads(ia)
    return [str(r['correct_answer'])] + [str(x) for x in ia]

def words(s): return re.findall(r"[\w'’-]+", s.lower())

# ── answer-set rules ──────────────────────────────────────────────────────

def strip_trailing_period(o):
    """Button labels do not end in a full stop."""
    if all(x.rstrip().endswith('.') and not x.rstrip().endswith('..') for x in o):
        return [x.rstrip().rstrip('.').rstrip() for x in o]
    return o

def strip_shared_prefix(o):
    """All four start with the same words: "The escape velocity is X" -> "X"."""
    toks = [x.split() for x in o]
    n = 0
    while all(len(t) > n + 1 for t in toks) and len({t[n].lower() for t in toks}) == 1:
        n += 1
    if n == 0: return o
    out = [' '.join(t[n:]) for t in toks]
    if any(not x.strip() for x in out): return o
    return [x[0].upper() + x[1:] if x and x[0].islower() else x for x in out]

def strip_shared_suffix(o, question):
    """All four end with the same word AND the question already says it:
       "How many chambers ...?" -> "Four chambers" becomes "Four"."""
    toks = [x.split() for x in o]
    if not all(len(t) > 1 for t in toks): return o
    last = {t[-1].lower().strip('.,') for t in toks}
    if len(last) != 1: return o
    word = last.pop()
    if word not in words(question): return o
    out = [' '.join(t[:-1]) for t in toks]
    if any(not x.strip() for x in out): return o
    return out

HEDGE = re.compile(r'^(about|approximately|around|roughly|nearly|circa)\s+', re.I)
def strip_shared_hedge(o):
    """Every option hedges, so the hedge carries no information."""
    if all(HEDGE.match(x) for x in o):
        return [HEDGE.sub('', x) for x in o]
    return o

PAREN = re.compile(r'^(.*?)\s*\(([^)]+)\)\s*$')
def resolve_parenthetical(o):
    """"The Museum of Modern Art (MoMA)" -> "MoMA"; "Kartikeya (Murugan)" -> "Kartikeya".

    An all-caps parenthetical is only the head's abbreviation if its letters are
    actually the head's initials. Not every bracketed capital is: "The Battle
    for Lake Tanganyika (WWI)" is a battle disambiguated by its war, and reading
    that as an abbreviation leaves the answer as the bare string "WWI".
    """
    out = []
    for x in o:
        m = PAREN.match(x)
        if not m: out.append(x); continue
        head, inner = m.group(1).strip(), m.group(2).strip()
        initials = ''.join(w[0] for w in re.findall(r"[A-Za-z][\w'’-]*", head)
                           if w[0].isupper()).upper()
        if inner.isupper() and len(inner) < len(head) and inner.replace('.', '') == initials:
            out.append(inner)
        else:
            out.append(head)
    return out

ARTICLE = re.compile(r'^(the|a|an)\s+', re.I)
def drop_articles(o):
    """Quiz button labels do not need a leading article, and dropping it per
    option cannot change which one stands out — every option loses the same
    word or has none to lose."""
    out = [ARTICLE.sub('', x) for x in o]
    return out if all(x.strip() for x in out) else o

def percent_sign(o):
    if all(re.search(r'\bpercent\b', x, re.I) for x in o):
        return [re.sub(r'\s*\bpercent\b', '%', x, flags=re.I) for x in o]
    return o

# ── question rules ────────────────────────────────────────────────────────
Q_RULES = [
    (re.compile(r'^Which of the following\b', re.I), 'Which'),
    (re.compile(r'^Which of these\b', re.I), 'Which'),
    (re.compile(r'^Which one of the\b', re.I), 'Which'),
    (re.compile(r'^In the context of [^,]+,\s*', re.I), ''),
    (re.compile(r'^According to [^,]+,\s*', re.I), ''),
    (re.compile(r'^Based on [^,]+,\s*', re.I), ''),
    (re.compile(r'\s+of the following\b', re.I), ''),
    (re.compile(r'\bis (?:widely |generally |commonly )?(?:considered|regarded as|known as)\b', re.I), 'is'),
    (re.compile(r'\bapproximately\s+', re.I), ''),
    (re.compile(r'\btypically\s+', re.I), ''),
    (re.compile(r'\bprimarily\s+', re.I), ''),
    (re.compile(r'\bspecifically\s+', re.I), ''),
    (re.compile(r'\bactually\s+', re.I), ''),
    (re.compile(r'\bin total\b', re.I), ''),
]

def trim_question(q):
    out = q
    for pat, repl in Q_RULES:
        if len(out) <= Q_MAX: break
        cand = re.sub(pat, repl, out, count=1)
        cand = re.sub(r'\s{2,}', ' ', cand).strip()
        if cand and cand != out and cand.endswith('?'):
            out = cand[0].upper() + cand[1:]
    return out

# ── run ───────────────────────────────────────────────────────────────────
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

resolved, residue = [], []
for qid in sorted(wl['rewrite']):
    if qid[:8] in already: continue
    r = by_id[qid]
    o = opts(r)
    if len(o) != 4: residue.append(qid); continue

    # Notation is not prose. Word-level rules mangle "∫ₐᵇ f(x)dx" into "∫ₐᵇ f"
    # and change what the answer means, so hand these to a person untouched.
    if any(re.search(r'[^\x00-\x7F]', x) for x in o): residue.append(qid); continue

    q = r['question_text']
    if len(q) > Q_MAX: q = trim_question(q)

    a = list(o)
    for rule in (strip_trailing_period, strip_shared_prefix, strip_shared_hedge,
                 resolve_parenthetical, drop_articles, percent_sign):
        a = rule(a)
    a = strip_shared_suffix(a, q + ' ' + r['question_text'])
    a = strip_trailing_period(a)

    lens = [len(x) for x in a]
    leaks = lens[0] == max(lens) and lens[0] - sorted(lens)[-2] > 6
    ok = (len(q) <= Q_MAX and q.strip().endswith('?')
          and max(lens) <= A_MAX and not leaks
          and len({same_option(x) for x in a}) == 4
          and all(x.strip() for x in a)
          and not (norm(a[0]) in norm(q) and len(norm(a[0])) > 4
                   and norm(a[0]) not in {'before','after','yes','no','same'}))
    if not ok:
        residue.append(qid); continue

    d = {'id': qid[:8]}
    if q != r['question_text']: d['q'] = q
    if a != o: d['c'], d['w'] = a[0], a[1:]
    if len(d) > 1: resolved.append(d)
    else: residue.append(qid)

with open('trimmed.jsonl', 'w') as f:
    for d in resolved: f.write(json.dumps(d, ensure_ascii=False) + '\n')

json.dump(residue, open('residue.json', 'w'), indent=0)
print(f'queue                : {len(wl["rewrite"]) - len(already)}')
print(f'resolved by rule     : {len(resolved)}')
print(f'still needs a person : {len(residue)}')

#!/usr/bin/env python3
"""Split the rewrite queue into tiers, worst-first.

Tier 2 is what a player actually sees go wrong: text that gets cut off, sets
with the wrong number of options, foreign script. Tier 3 renders fine but sits
outside the project's own 70/20 standard. Tier 4 is only a guessability leak.

Tier 1 is not listed here — it is whatever has already been written into
rewrites.jsonl or resolved by safe-trim.py.
"""
import json, collections, sys

rows = [json.loads(l) for l in open('en_raw.jsonl')]
by_id = {r['id']: r for r in rows}
wl = json.load(open('worklist.json'))

done = {json.loads(l)['id'] for l in open('rewrites.jsonl') if l.strip()}
try:
    done |= {json.loads(l)['id'] for l in open('trimmed.jsonl') if l.strip()}
except FileNotFoundError:
    pass

def opts(r):
    ia = r.get('incorrect_answers') or []
    if isinstance(ia, str): ia = json.loads(ia)
    return [str(r['correct_answer'])] + [str(x) for x in ia]

TIERS = collections.defaultdict(list)
for qid, why in wl['rewrite'].items():
    if qid[:8] in done: continue
    r = by_id[qid]
    o = opts(r)
    longest = max(len(a) for a in o)
    qlen = len(r['question_text'])
    if any(w.startswith(('only_', 'duplicate_options', 'foreign_')) for w in why):
        t = 'T2 structural'
    elif longest > 48:
        t = 'T2 answer clips'
    elif qlen > 90:
        t = 'T2 question squeezes'
    elif longest > 30:
        t = 'T3 answer 31-48'
    elif longest > 20:
        t = 'T3 answer 21-30'
    elif qlen > 70:
        t = 'T3 question 71-90'
    else:
        t = 'T4 correct-longest'
    TIERS[t].append(qid)

json.dump(dict(TIERS), open('tiers.json', 'w'))
total = 0
for k in sorted(TIERS):
    print(f'  {len(TIERS[k]):5d}  {k}')
    total += len(TIERS[k])
print(f'  {total:5d}  remaining')
print(f'  {len(done):5d}  already rewritten')

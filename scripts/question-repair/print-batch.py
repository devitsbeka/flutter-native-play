#!/usr/bin/env python3
"""Print one batch of the rewrite queue in a compact form."""
import json, sys, re

N = int(sys.argv[1]) if len(sys.argv) > 1 else 0
SIZE = int(sys.argv[2]) if len(sys.argv) > 2 else 55

rows = [json.loads(l) for l in open('en_raw.jsonl')]
by_id = {r['id']: r for r in rows}
cats = {c['id']: c['name'] for c in json.load(open('categories.json'))}
wl = json.load(open('worklist.json'))

def opts(r):
    ia = r.get('incorrect_answers') or []
    if isinstance(ia, str): ia = json.loads(ia)
    return [str(r['correct_answer'])] + [str(x) for x in ia]

queue = sorted(wl['rewrite'].items())
batch = queue[N * SIZE:(N + 1) * SIZE]
print(f'# batch {N}  ({N*SIZE+1}-{N*SIZE+len(batch)} of {len(queue)})')
for qid, why in batch:
    r = by_id[qid]
    o = opts(r)
    need = []
    if any(w.startswith('question_') for w in why): need.append('Q')
    if any(w.startswith('answer_') for w in why): need.append('A')
    if 'duplicate_options' in why or any(w.startswith('only_') for w in why): need.append('OPT')
    if 'foreign_script' in why: need.append('LANG')
    print(f'\n{qid[:8]} [{"+".join(need)}] q{len(r["question_text"])} a{max(len(a) for a in o)}')
    print(f'  Q: {r["question_text"]}')
    print(f'  +: {o[0]}')
    for x in o[1:]:
        print(f'  -: {x}')

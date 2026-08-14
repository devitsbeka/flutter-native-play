#!/usr/bin/env python3
"""Print the next slice of the queue, worst-first.

Ordering is by what it costs the player, not by how far off the standard the
row is. A set where the CORRECT answer is the longest can be picked without
reading it, so those come first; a set where only a distractor runs long reads
slightly smaller and nothing else, so those come last.
"""
import json, sys

N = int(sys.argv[1]) if len(sys.argv) > 1 else 80
OFFSET = int(sys.argv[2]) if len(sys.argv) > 2 else 0

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

def rank(qid):
    r = by_id[qid]
    o = opts(r)
    lens = [len(x) for x in o]
    q = len(r['question_text'])
    if lens[0] == max(lens) and lens[0] > 20: return 0   # guessable
    if q > 70: return 1                                  # stem over the limit
    if max(lens) > 30: return 2                          # drops to 14px
    return 3                                             # cosmetic

queue = sorted((qid for qid in wl['rewrite'] if qid[:8] not in done),
               key=lambda q: (rank(q), q))
print(f'# queue {len(queue)}  showing {OFFSET+1}-{min(OFFSET+N, len(queue))}')
for qid in queue[OFFSET:OFFSET + N]:
    r = by_id[qid]
    o = opts(r)
    print(f'{qid[:8]} q{len(r["question_text"])} | {r["question_text"]}')
    print(f'   + {o[0]}')
    print(f'   - {" / ".join(o[1:])}')

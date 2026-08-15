#!/usr/bin/env python3
"""Repair the 152 English questions left in the Library.

These are the residue of the main repair pass: questions flagged as too long
and staged rather than rewritten. Every one of them is over 90 characters —
the point where the stem pushes the answers into a scroll region — so none of
them can be promoted as they stand. Median length is 123; the target is 70.

Reading them, length turned out to be the surface problem. Three deeper faults
run through the batch, and they are why a third of it is retired rather than
shortened:

**Clipped answers.** "Orient. & Imm. Mem.", "Compressed Marine R. Rains",
"Enhanced Budget Ctrl". A generator squeezed answers under a character limit by
abbreviating words until they stopped being words. The stem can be rewritten;
these cannot be recovered without inventing what they meant.

**Essay answers.** Options running 60-100 characters where one is visibly the
considered, complete-sentence one and the rest are curt. Guessable without
knowing anything.

**Questions with no fact underneath.** An opinion ("which statement best
encapsulates Anthony Bourdain's philosophy"), a survey number that has already
drifted, a Rotten Tomatoes score, a misattributed quote.

Everything retired stays in the table with `quality_status = 'retired_library'`,
so any of it is one UPDATE from coming back.
"""
import json, sys

QUESTION_MAX = 70
ANSWER_HARD = 48

# ── retire ───────────────────────────────────────────────────────────────────
RETIRE = {
    '78ab62c4': 'the correct answer is also one of the distractors',
    '9649982a': "distractor reads 'Grown in tropics only in tropical areas cultivate tropical'",
    'f3c382fb': 'false premise — Mars is a distractor in a question about gas giants, and Venus is not one either',
    '3a2f7bbd': 'the quote is a well-known misattribution to the Buddha',
    '732d9d5d': "'Cognitive Anchors' is not a term in the field",
    '3bfe71a5': 'a 2023 survey percentage, already drifting',
    '9da8d70b': 'a Rotten Tomatoes score, which changes',
    '55fefda5': 'an unverifiable streaming record, with 50-character answers',
    '61a524ac': "opinion — 'which statement best encapsulates Bourdain's philosophy'",
    'a0ac84a7': "opinion — a paraphrase of an Edison quote",
    '893ca9d5': 'opinion — a trend in public sentiment',
    '1a0b5123': 'opinion — a social consequence, with essay answers',
    '74bcfccb': 'opinion about a screenwriting convention',
    '3131ebd1': 'opinion, and the correct answer is the only complete sentence',
    '327dd3f3': 'opinion, and the correct answer is the only complete sentence',
    '57a63bf7': 'the correct answer is an 80-character sentence; the rest are curt',
    'acd419cf': 'essay answers, and the correct one is self-evidently right',
    '64c60e99': 'essay answers',
    '0ec7baee': 'vague — no single defensible answer',
    '581e3fd3': "vague — 'despite self-help book exaggerations'",
    '67728c15': 'vague — attributes a benefit to an unnamed theory',
    'bac7dc3d': "answer is 'Simplified' against 'More complex' — a matter of degree",
    '9918fe73': 'a claim about AI cognition that reads as opinion',
    '8a0336be': "distractors are fragments — 'No need for translation'",
    'b6709046': "clipped answers — 'Enhanced Budget Ctrl', 'Reduced Bulk Discount'",
    '6adeea3d': "clipped answers — 'Compressed Marine R. Rains'",
    '0c78ade3': "clipped answers — 'Orient. & Imm. Mem.', 'Pupil React. & Vision'",
    'ca478f8f': "clipped answers — 'Instant, absolute cert.'",
    'd87d686f': "clipped answers — 'Skill improving w/ practice'",
    '13da3309': "clipped answers — 'Altitude, Climate, Bio', 'Location: Land, Sea'",
    '65f3dd50': "clipped answers — 'News, Entertainment, Edu'",
    'dcbe9fb1': "clipped answers — 'Hundreds Billions USD'",
    'b02bd858': 'answer pairs that do not parse as alternatives',
    'bdf8ecf9': 'the correct answer and one distractor both describe reach and engagement',
    '162d0adc': 'an informal hierarchy with no authority behind it',
    '23bd8d18': '90-character answers listing examples',
    '998c237d': '95-character answers; the correct one is the only hedged sentence',
    '0387cbcc': "answer is 'Chem & Application'",
    '67bf272c': "answer is 'Antibody-drug conj.'",
    'e542c0d2': "answers are 'Microscope tech', 'New surgery', 'Disease theory'",
}

# ── rewrite: id -> stem, and answers where they also needed work ──────────────
REWRITE = {
    '010ff21e': ("Which cancer is caused almost exclusively by asbestos?", None, None),
    '03183e9c': ("What is drawing the frames between two key poses called?", None, None),
    '05480ffb': ("What did Japan's Sakoku isolation policy do to its economy?",
                 'Made it self-sufficient', ['Caused widespread famine', 'Sped industrialization', 'Collapsed the currency']),
    '05a34b41': ("What did ancient cultures schedule by the lunar cycle?",
                 'Religious festivals', ['Daily work hours', 'Personality traits', 'National borders']),
    '05d8f0bc': ("In which country was umami first identified as a basic taste?", None, None),
    '069f604c': ("Which Fertile Crescent grain became the first leavened bread?", None, None),
    '06e843cb': ("Which outer planet got the most expensive robotic mission?", None, None),
    '0abb8e56': ("Which manga has won the most Eisner Awards in English?", None, None),
    '0bac04ea': ("Which dockless commuter vehicle boomed in the late 2010s?", None, None),
    '0e3c48f7': ("Which ad format implies a dramatic transformation?",
                 'Before and after', ['Progress logs', 'Duration disclaimers', 'Video testimonials']),
    '0f5ec842': ("What does Occam's Razor say to prefer in an explanation?",
                 'The fewest assumptions', ['The most evidence', 'The most complexity', 'The most predictions']),
    '1633c4a8': ("Which labourer's workwear became a global fashion staple?", None, None),
    '18d63d45': ("Which rating scale is standard in anxiety questionnaires?", None, None),
    '1f2dd728': ("Which site is a meme punchline for diagnosing you with cancer?", None, None),
    '1fc1be05': ("Which algorithm finds the shortest path in a weighted graph?",
                 'A* search', ['Bubble sort', 'Hash function', 'Memory manager']),
    '24d2b3a6': ("Which phone was recalled in 2016 for catching fire?",
                 'Galaxy Note 7', ['iPhone 6 Plus', 'Nexus 6P', 'OnePlus 2']),
    '2a0b6cbf': ("Which encryption standard did NIST adopt in 2001?",
                 'AES', ['RSA', 'DES', 'Elliptic curve']),
    '2decccf0': ("In which game series does Link quest to save Hyrule?", None, None),
    '2f8c00fd': ("In what year did CERN put the World Wide Web in the public domain?", None, None),
    '3047ded9': ("Who won the 1938 Physics Nobel for induced radioactivity?", None, None),
    '347461e2': ("Where and when did Jenner first vaccinate against smallpox?", None, None),
    '398a33c9': ("In which decade was humanistic psychology's association founded?", None, None),
    '3a8e8508': ("Which rule limits what a sports team can spend on salaries?",
                 'Salary cap', ['Rookie minimums', 'Endorsement deals', 'Coaching bonuses']),
    '3c5bf14c': ("What single-display resolution does DisplayPort 2.1 support?",
                 '16K', ['8K', '12K', '4K']),
    '3e4b98e6': ("What injured child labourers most in Victorian factories?",
                 'Unguarded machinery', ['Loud noise', 'Poor ventilation', 'Repetitive strain']),
    '3f2feb93': ("Which method optimises a linear goal under linear constraints?",
                 'Linear programming', ['Trial and error', 'Graphing', 'Matrix inversion']),
    '452c2672': ("Which programming paradigm was the first widely adopted?", None, None),
    '47ffa8d5': ("Which US agency enforces consumer privacy against social platforms?",
                 'The FTC', ['The FCC', 'The DOJ', 'The SEC']),
    '49d8a15f': ("What is a drainage basin with no outflow to the sea called?", None, None),
    '4d007ea4': ("Which TikTok feature records your video beside someone else's?", None, None),
    '4e2936eb': ("Which Gege Akutami manga was animated in 2020?", None, None),
    '4f929f6a': ("Which US law protects species at risk of extinction?",
                 'ESA', ['EPA', 'USFWS', 'CITES']),
    '5183c325': ("What are microbes that help their host called?",
                 'Beneficial bacteria', ['Viral mutation', 'Antibiotic resistance', 'Pathogen transmission']),
    '51eab561': ("Who made an official poster for the 1984 Sarajevo Olympics?",
                 'Andy Warhol', ['Banksy', 'Jean-Michel Basquiat', 'Keith Haring']),
    '599f670f': ("Which magazine first published the Sherlock Holmes stories?",
                 'The Strand', ["Blackwood's", 'Punch', "Pearson's"]),
    '5c437036': ("Which thought experiment weighs one life against several?", None, None),
    '5cb63574': ("Who made the 2015 album 'The Race for Space'?", None, None),
    '5ed7c078': ("Which 19th-century model maps farming around a market town?", None, None),
    '62fa5c97': ("How is cuisine classified by geographic reach?",
                 'Continental, regional, local', ['Global, national, urban', 'Traditional, modern, fusion', 'Costly, moderate, budget']),
    '63838fb7': ("Which sitcom first got 11 straight Outstanding Comedy nods?", None, None),
    '66dbab92': ("Which fast-fashion chain filed for Chapter 11 in 2019?", None, None),
    '67c51224': ("Which two seasonings did NASA make liquid for spaceflight?",
                 'Salt and pepper', ['Sriracha and ginger', 'Cinnamon and nutmeg', 'Vanilla and parsley']),
    '6b95eaed': ("Which concept behind positional notation came from ancient India?", None, None),
    '6d8c82cc': ("Who won the 2023 Best Actor Oscar for playing a physicist?", None, None),
    '6e2e4b3c': ("Which metal are most US military service medals made from?", None, None),
    '79f88c8d': ("Who directed the first feature with synchronised dialogue?", None, None),
    '7a58ef1d': ("Which physics framework assumes absolute simultaneity?", None, None),
    '7aec688c': ("Which national award did Albert Bandura receive in 2016?",
                 'National Medal of Science', ['Medal of Freedom', 'Nobel Prize', 'Pulitzer Prize']),
    '7cdcd1ba': ("What does relativity predict matter becomes at a singularity?",
                 'Infinitely dense', ['Annihilated', 'Expelled', 'Dark energy']),
    '7dce3568': ("What do sociologists call the main draw of gaming communities?",
                 'Belonging', ['Financial gain', 'Competitive status', 'Passive entertainment']),
    '803a9fa6': ("Which platform popularised the lifestyle influencer in the 2010s?", None, None),
    '8147112e': ("Which Netflix series was cancelled after one season in 2023?", None, None),
    '8233693e': ("Which Detroit stadium's roof deflated under snow in 1985?", None, None),
    '8291f81e': ("What shows whether a stock is up or down on a ticker?",
                 'Colour', ['Arrows', 'Star ratings', 'Currency symbols']),
    '8317a156': ("What do archaeologists think the Great Pyramid was built as?",
                 "Khufu's tomb", ['An observatory', 'A water pump', 'A grain store']),
    '86d4d5ba': ("Which mythic archetype is defined by cunning and rule-breaking?", None, None),
    '8a57434c': ("Which shoe brand began in 1906 making arch supports?", None, None),
    '8a768685': ("Which property of gold made alchemists call it incorruptible?",
                 'It does not corrode', ['Its density', 'Its malleability', 'Its lustre']),
    '8e1f959a': ("Who co-founded Instagram?", None, None),
    '9283f4d9': ("Which kind of algorithm is blamed for filter bubbles?",
                 'Social media feeds', ['Search ranking', 'Product recommendations', 'Streaming suggestions']),
    '96e78e9b': ("What caused the 1992 fluoride poisoning in Hooper Bay, Alaska?",
                 'Faulty fluoridation gear', ['Contaminated drugs', 'Industrial waste', 'Pesticide runoff']),
    '97ee191f': ("Which lab runs the world's largest ultra-high vacuum system?",
                 'CERN', ['Fermilab', 'SLAC', 'Brookhaven']),
    '9a2e4001': ("What whole number does 1 Kings 7:23 use for pi?", None, None),
    '9dcb59cb': ("Which word marks a cut scene in a screenplay?", None, None),
    '9f22419a': ("What is the belief that forensics gives instant answers called?",
                 'The CSI effect', ['The lone wolf', 'The perfect witness', 'The confession scene']),
    '9f2c7708': ("Which asset fuelled the housing bubble before the 2008 crash?",
                 'Subprime mortgages', ['Corporate bonds', 'Government bonds', 'Commodity futures']),
    '9fc9e8fd': ("Which studio did Tyler Perry found in Atlanta?", None, None),
    'a555d56d': ("Which Olympic venue is famous for its tent-like cable roof?",
                 'Munich', ['Rome', 'Montreal', 'Beijing']),
    'a6009235': ("Where is Marvel Studios headquartered?",
                 'Los Angeles', ['New York', 'Atlanta', 'Vancouver']),
    'a81aacd8': ("What were early Middle Eastern mosque domes mostly built from?", None, None),
    'aba3f157': ("How do today's extinction rates compare to the natural rate?",
                 'Much higher', ['Slightly lower', 'About the same', 'Not established']),
    'ada05831': ("Which process hardens the rubber soles of canvas sneakers?",
                 'Vulcanisation', ['Polymerisation', 'Air curing', 'Injection moulding']),
    'b050fb9e': ("What is the main danger of an MRI scanner's magnetic field?",
                 'Flying metal objects', ['Radiation poisoning', 'Acoustic trauma', 'Chemical exposure']),
    'b4bc59f4': ("What is a building style tied to a historical period called?",
                 'An architectural era', ['A structural typology', 'An urban plan', 'A material index']),
    'b87ee2c6': ("Which tutorial flaw do experienced gamers complain about most?",
                 'It cannot be skipped', ['Too much hand-holding', 'Long text screens', 'Forced movement drills']),
    'ba24f42c': ("Which fast forbids water as well as food?",
                 'Dry fasting', ['Water fasting', 'Intermittent fasting', 'Lenten fasting']),
    'bba52df0': ("What is a series with a set number of episodes called?", None, None),
    'bef6cac5': ("Which 2009 James Cameron film became the top grosser ever?", None, None),
    'bef90ffc': ("Who wrote 'Premature optimization is the root of all evil'?", None, None),
    'c221dd12': ("Whose snack brand drew a kimchi comparison controversy?",
                 'Lunchly', ['Lucky Lee', 'Bon Appetit', 'Taco Bell']),
    'c6fb15a1': ("What did 19th-century digging cost Stonehenge most?",
                 'Its stratigraphy', ['Its outer stones', 'Its alignment', 'Its burial goods']),
    'c916573e': ("Which actor holds the record for the most screen credits?", None, None),
    'c9613fd2': ("Which spatial metaphor describes the political spectrum?",
                 'Left to right', ['Alphabetical', 'Numerical score', 'By age']),
    'd062f9f0': ("Which biome boundary forms the sharpest ecotone?",
                 'Grassland to forest', ['Tropical to subtropical', 'Temperate to boreal', 'Tundra to boreal']),
    'd47b6566': ("Which currency became notorious in Zimbabwe's hyperinflation?", None, None),
    'd48768f3': ("What classifies a sensor by the phenomenon it detects?",
                 'Transduction principle', ['Output signal', 'Power draw', 'Application domain']),
    'd72b0368': ("Whose 1966 book laid the ground for postmodern architecture?", None, None),
    'd8ad4185': ("Which therapy family is defined by changing thought and habit?",
                 'Cognitive behavioural', ['Psychodynamic', 'Humanistic', 'Systemic']),
    'db7bc02f': ("Which system navigates by sound, as bats do?",
                 'Sonar', ['Radar', 'Lidar', 'Infrared']),
    'df09e915': ("Which cosmology echoes the Hindu view of repeating time?",
                 'A cyclic universe', ['Steady state', 'Big Bang', 'Heat death']),
    'e0a90f8a': ("How does quantitative easing push asset prices up indirectly?",
                 'It pushes money into risk', ['It cuts short-term rates', 'It raises state spending', 'It lifts wages']),
    'e431eca2': ("Which cosmonaut took the Olympic torch to the ISS in 2013?",
                 'Mikhail Tyurin', ['Sunita Williams', 'Chris Hadfield', 'Samantha Cristoforetti']),
    'e7322064': ("Who shared the 2011 Wolf Prize for cell reprogramming?", None, None),
    'e77ee6c2': ("Which lizard changes colour and has zygodactyl feet?",
                 'Chameleon', ['Gecko', 'Iguana', 'Skink']),
    'e7d8cdb7': ("What disrupted poultry and egg supply from 2021 to 2023?",
                 'Bird flu', ['African swine fever', 'Foot-and-mouth', 'Salmon disease']),
    'e8715eec': ("Which conservation programme costs the most farmland per animal?",
                 'Panda breeding', ['Tiger reserves', 'Elephant corridors', 'Rhino patrols']),
    'ea17cd73': ("What locked engineers out during the 2021 Facebook outage?",
                 'The badge readers', ['The power grid', 'The network cables', 'A fire alarm']),
    'eb7acdc9': ("Which Worth silhouette changed 19th-century women's dress?", None, None),
    'ec788a4f': ("Which body maintains the definitions of the SI units?",
                 'The BIPM', ['The ISO', 'The IEEE', 'The WMO']),
    'eddcca2a': ("Which two notations besides Big O did Knuth standardise?",
                 'Big Omega and Big Theta', ['Little o and little omega', 'Alpha and beta', 'Sigma and delta']),
    'eeecfd0d': ("Which African animal lost 90% of its numbers to horn poaching?", None, None),
    'ef219fb0': ("Which GIF trait made it the format of looping memes?",
                 'It replays by itself', ['High resolution', 'Embedded audio', 'Vector scaling']),
    'f059e7bd': ("Which space technology sharpened Olympic timing?",
                 'Atomic clocks', ['Uniform fabrics', 'Stadium seating', 'Shoe compounds']),
    'f1231c3e': ("In which system does the legislature choose the executive?",
                 'Parliamentary', ['Presidential', 'Semi-presidential', 'Confederal']),
    'f3d0fa4d': ("Which love-linked neurochemical occurs naturally in chocolate?",
                 'PEA', ['Serotonin', 'Dopamine', 'Endorphins']),
    'f6810619': ("Whose skeleton hangs in the Natural History Museum's main hall?",
                 'A blue whale', ['A sperm whale', 'A humpback whale', 'A fin whale']),
    'fc95d58b': ("Which asbestos type was used for fireproofing before its ban?",
                 'Chrysotile', ['Fibreglass', 'Ceramic fibre', 'Silica gel']),
    'fd484e92': ("Which two schools argue over reason versus the senses?",
                 'Rationalism, empiricism', ['Idealism, realism', 'Skepticism, dogmatism', 'Phenomenology, existentialism']),
    'fdbe7539': ("Which tool projects a laser line to check a wall is plumb?",
                 'Laser level', ['Tape measure', 'Speed square', 'Chalk line']),
    'fe48bcd2': ("Which hand adaptation lets primates grip and use tools?", None, None),
    'fe996b13': ("Which crocus-derived spice outpriced gold by weight in the 1300s?", None, None),
    'ff9605e8': ("Which problems will quantum computers solve much faster?",
                 'Factoring large numbers', ['Every problem', 'No problems', 'Storing data']),
}


def q(s):
    return "'" + s.replace("'", "''") + "'"


lib = {r['id'][:8]: r for r in json.load(open(sys.argv[1]))}

problems = []
for i, (stem, correct, wrong) in REWRITE.items():
    r = lib.get(i)
    if not r:
        problems.append(f'{i}: not in the library'); continue
    ca = correct if correct is not None else r['correct_answer']
    ia = wrong if wrong is not None else r['incorrect_answers']
    low = stem.lower()
    if len(stem) > QUESTION_MAX:
        problems.append(f'{i}: stem {len(stem)} chars')
    if not stem.rstrip().endswith('?'):
        problems.append(f'{i}: no question mark')
    if len(ia) != 3:
        problems.append(f'{i}: {len(ia)} distractors')
    if len({a.strip().lower() for a in [ca] + ia}) != 4:
        problems.append(f'{i}: duplicate options')
    for a in [ca] + ia:
        if len(a) > ANSWER_HARD:
            problems.append(f'{i}: answer {len(a)} chars — {a!r}')
    if len(ca) > 3 and ca.lower() in low and not any(w.lower() in low for w in ia):
        problems.append(f'{i}: stem leaks the answer {ca!r}')

for i in RETIRE:
    if i not in lib:
        problems.append(f'{i}: not in the library')
overlap = set(REWRITE) & set(RETIRE)
if overlap:
    problems.append(f'both rewritten and retired: {overlap}')
missed = set(lib) - set(REWRITE) - set(RETIRE)
if missed:
    problems.append(f'{len(missed)} library rows handled by neither: {sorted(missed)[:8]}')

if problems:
    for p in problems:
        print('  ' + p, file=sys.stderr)
    sys.exit(f'{len(problems)} problems — not emitting SQL')

rows = [(i, s, c if c is not None else lib[i]['correct_answer'],
         w if w is not None else lib[i]['incorrect_answers'])
        for i, (s, c, w) in REWRITE.items()]

CHUNK = 28
parts = []
for n in range(0, len(rows), CHUNK):
    body = ',\n'.join(
        f"    ({q(i)}, {q(s)}, {q(c)}, {q(json.dumps(w))}::jsonb)"
        for i, s, c, w in rows[n:n + CHUNK])
    parts.append(
        'UPDATE public.questions AS t\n'
        '   SET original_question_text = COALESCE(t.original_question_text, t.question_text),\n'
        '       original_correct_answer = COALESCE(t.original_correct_answer, t.correct_answer),\n'
        '       original_incorrect_answers = COALESCE(t.original_incorrect_answers, t.incorrect_answers),\n'
        '       question_text = v.stem,\n'
        '       correct_answer = v.correct,\n'
        '       incorrect_answers = v.wrong,\n'
        "       shorten_status = 'shortened'\n"
        '  FROM (VALUES\n' + body + '\n'
        '  ) AS v(id8, stem, correct, wrong)\n'
        " WHERE t.language = 'en' AND left(t.id::text, 8) = v.id8;")

parts.append(
    'UPDATE public.questions\n'
    '   SET is_active = false, in_production = false,\n'
    "       quality_status = 'retired_library'\n"
    " WHERE language = 'en'\n"
    '   AND left(id::text, 8) IN (\n     '
    + ',\n     '.join(', '.join(q(i) for i in sorted(RETIRE)[n:n + 6])
                      for n in range(0, len(RETIRE), 6))
    + '\n   );')

for n, part in enumerate(parts, 1):
    open(f'library-repair-{n}.sql', 'w').write(part + '\n')
    print(f'library-repair-{n}.sql  {len(part)} chars')
print(f'\n{len(REWRITE)} rewritten, {len(RETIRE)} retired, {len(lib)} total')

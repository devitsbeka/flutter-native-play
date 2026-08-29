-- The opening English pool for MyTrivia King (docs/GAME_TYPES_DESIGN.md §3.3).
--
-- Selection bar, applied to every row: answerable by pure reasoning with no
-- prior knowledge, culture- and currency-neutral, and each wrong option is
-- the destination of a plausible-but-flawed reasoning chain (the answer a
-- hasty solver actually produces), not filler. The explanation is mandatory
-- and spells out the derivation — a lost point should still teach.
--
-- This is a SEED, not the launch pool: the design doc calls for ~120 before
-- the mode goes live, and these 24 are the quality reference for the rest.
-- They ship is_active = true because the mode itself is dark-launched behind
-- game_types.is_live — nothing is drawable by a player until that flips —
-- but they still deserve a human read before launch. Additions follow the
-- same shape with source = 'curated'; translations are per-language rows
-- pointing back through translated_from.
--
-- Idempotent: the batch inserts once, keyed by its source tag.

INSERT INTO public.king_questions
  (language, question_text, correct_answer, incorrect_answers, explanation, difficulty, source, is_active)
SELECT * FROM (VALUES
  ('en',
   'You have two ropes. Each takes exactly one hour to burn from end to end, but they burn unevenly — half the rope does not mean half the hour. Using only these ropes and a lighter, how can you measure exactly 45 minutes?',
   'Light rope A at both ends and rope B at one end; when A is gone, light B''s other end',
   '["Burn rope A, then burn half of rope B", "Fold rope A in half and burn it alongside rope B", "Light both ropes at one end and stop when rope A is three quarters gone"]'::jsonb,
   'A rope lit at both ends is consumed in 30 minutes no matter how unevenly it burns — the two flames always meet after half the total burn time. When rope A dies, exactly 30 minutes have passed and rope B (lit at one end) has 30 minutes of burning left. Lighting B''s other end at that moment halves the remainder to 15. 30 + 15 = 45. The wrong options all rely on rope length meaning something, which the uneven burning explicitly takes away.',
   4, 'seed-en-1', true),

  ('en',
   'A snail climbs a 10-meter pole. Every day it climbs 3 meters; every night it slides back 2. On which day does it reach the top?',
   'Day 8',
   '["Day 10", "Day 7", "Day 9"]'::jsonb,
   'The trap is treating every day as a net +1. That holds only while the snail finishes a day below the top. After 7 full days and nights it stands at 7 meters. On day 8 it climbs 3 and touches 10 — it is at the top before the night''s slide ever happens. "Day 10" is the answer of pure net-progress arithmetic; the others misplace where the pattern breaks.',
   2, 'seed-en-1', true),

  ('en',
   'Three switches outside a closed room control three lamps inside. You may flip switches as much as you like, but you may open the door only once. How do you tell which switch controls which lamp?',
   'Hold one switch on a while, turn it off, turn a second on, then enter: warm lamp, lit lamp, cold lamp',
   '["Flip each switch quickly and listen for the filaments", "Turn two switches on and reason from which two lamps are lit", "It cannot be done with a single visit"]'::jsonb,
   'Light is not the only signal a lamp gives off — a lamp that has been on also carries heat. Run switch 1 for a few minutes, switch it off, switch 2 on, and walk in: the lit lamp is 2, the dark-but-warm lamp is 1, the dark-and-cold lamp is 3. Two switches on gives only two named lamps and one guess — the version that feels sufficient but is one bit of information short.',
   3, 'seed-en-1', true),

  ('en',
   'In a running race you overtake the runner in second place. What position are you in now?',
   'Second',
   '["First", "Third", "It depends on how many runners there are"]'::jsonb,
   'Overtaking someone puts you in the position they held. The runner you passed was second, so you are now second and they are third. "First" comes from the feeling that passing someone near the front must make you the leader — but you never passed the leader.',
   1, 'seed-en-1', true),

  ('en',
   'A father is 36 and his child is 6. In how many years will the father be exactly three times as old as the child?',
   '9 years',
   '["6 years", "12 years", "15 years"]'::jsonb,
   'Let the number of years be x: 36 + x = 3 × (6 + x), so 36 + x = 18 + 3x, giving x = 9. Check: 45 and 15. The age GAP of 30 years never changes, so the father is three times as old exactly when the child''s age equals half that gap — 15. The wrong options come from dividing the wrong things: 36/6 suggests 6, and doubling or halving ages suggests 12 and 15.',
   3, 'seed-en-1', true),

  ('en',
   'You have a 5-liter jug, a 3-liter jug, and a fountain of water. How do you end up with exactly 4 liters?',
   'Fill 5, pour into 3, empty 3, pour the 2 across, refill 5, top up 3 — 4 stays behind',
   '["Fill the 3-liter jug and add a third of it to a full 5-liter jug", "Fill both jugs and pour away half of the total", "Fill the 5-liter jug and pour out what looks like a fifth"]'::jsonb,
   'Fill the 5 and pour into the 3: the big jug now holds exactly 2. Empty the 3 and move the 2 into it — the small jug now has room for exactly 1 more. Refill the 5 and top up the 3: exactly 1 liter leaves the big jug, stranding exactly 4. Every step is exact because it either fills or empties a jug completely; the wrong options all need you to eyeball a fraction, which the puzzle gives you no way to do.',
   3, 'seed-en-1', true),

  ('en',
   'A farmer has 17 sheep. All but 9 run away. How many sheep are left?',
   '9',
   '["8", "17", "None"]'::jsonb,
   '"All but 9" means "all except 9" — the 9 are the ones that stayed. The reflex is to subtract (17 − 9 = 8) because the sentence has the rhythm of a subtraction problem, but the 9 was never a count of the ones leaving.',
   1, 'seed-en-1', true),

  ('en',
   'If 5 machines take 5 minutes to make 5 widgets, how long do 100 machines take to make 100 widgets?',
   '5 minutes',
   '["100 minutes", "20 minutes", "1 minute"]'::jsonb,
   'From the setup, one machine makes one widget in 5 minutes. A hundred machines each making their own widget still take 5 minutes — the work is perfectly parallel. "100 minutes" comes from pattern-matching the numbers (5-5-5 → 100-100-100); the others come from dividing things that should not be divided.',
   2, 'seed-en-1', true),

  ('en',
   'A patch of lily pads doubles in size every day. It covers the whole lake on day 48. On which day did it cover half the lake?',
   'Day 47',
   '["Day 24", "Day 46", "Day 12"]'::jsonb,
   'Doubling every day means the day before full coverage it was exactly half. So: day 47. "Day 24" is the linear-growth answer — halving the time instead of undoing one doubling. Exponential processes spend almost all their time looking small, which is exactly why this feels wrong.',
   2, 'seed-en-1', true),

  ('en',
   'A bat and a ball together cost 110 coins. The bat costs 100 coins more than the ball. What does the ball cost?',
   '5 coins',
   '["10 coins", "15 coins", "1 coin"]'::jsonb,
   'If the ball costs b, the bat costs b + 100, and together: 2b + 100 = 110, so b = 5. Check: 5 + 105 = 110 and the difference is exactly 100. The immediate answer "10" satisfies the total but makes the difference only 90 — it treats "100 more" as "the bat is 100".',
   2, 'seed-en-1', true),

  ('en',
   'A man looks at a portrait and says: "Brothers and sisters I have none, but that man''s father is my father''s son." Who is in the portrait?',
   'His son',
   '["Himself", "His father", "His brother"]'::jsonb,
   'Work from the inside out: "my father''s son", for a man with no siblings, is the speaker himself. Substitute: "that man''s father is ME" — so the portrait shows his son. "Himself" is what the sentence sounds like before the substitution; "his brother" is ruled out in the first clause.',
   3, 'seed-en-1', true),

  ('en',
   'You have 8 identical-looking balls; one is slightly heavier. Using a balance scale, how many weighings do you need, in the worst case, to be certain which it is?',
   '2',
   '["3", "4", "7"]'::jsonb,
   'Weigh 3 against 3. If they balance, the heavy ball is one of the 2 left aside — one more weighing settles it. If one side sinks, the heavy ball is among those 3: weigh 1 against 1 of them, and either one sinks or it is the third. Each weighing has three outcomes (left, right, balance), so it can cut the candidates in three, not two — the "3" answer comes from halving like a yes/no question.',
   4, 'seed-en-1', true),

  ('en',
   'At six o''clock a clock takes 5 seconds to strike 6 times. How long does it take to strike 12 times at midnight?',
   '11 seconds',
   '["10 seconds", "12 seconds", "6 seconds"]'::jsonb,
   'What takes time is not the strikes but the gaps between them. Six strikes have 5 gaps, so each gap is 1 second. Twelve strikes have 11 gaps: 11 seconds. "10" doubles the original time — which silently assumes 6 strikes take 6 gaps.',
   3, 'seed-en-1', true),

  ('en',
   'Two fathers and two sons share three apples, and each person eats exactly one whole apple. How is that possible?',
   'They are grandfather, father, and son — three people',
   '["One apple was cut and shared", "One of them ate two", "It is not possible"]'::jsonb,
   '"Two fathers and two sons" does not have to mean four people. A grandfather, his son, and his grandson contain two fathers (grandfather, father) and two sons (father, son) in three people — the middle man counts twice. Three people, three apples, one each. Every wrong option quietly keeps the assumption that four people are present.',
   2, 'seed-en-1', true),

  ('en',
   'How many times can you subtract 10 from 100?',
   'Once',
   '["Ten times", "Nine times", "As many times as you like"]'::jsonb,
   'After the first subtraction you are no longer subtracting from 100 — you are subtracting from 90. The question asks specifically about subtracting from 100, which can only ever happen once. "Ten times" answers a different question: how many steps until nothing remains.',
   2, 'seed-en-1', true),

  ('en',
   'A fair coin has landed heads 9 times in a row. What is the chance the next flip is also heads?',
   'Exactly 1 in 2',
   '["Less than 1 in 2 — tails is overdue", "More than 1 in 2 — the coin is on a streak", "1 in 1024"]'::jsonb,
   'The coin has no memory: each flip of a fair coin is 1/2 regardless of history. "Tails is overdue" is the gambler''s fallacy; "on a streak" is the same fallacy in the other direction. 1/1024 is the probability of ten heads in a row computed BEFORE any flips — not the probability of one more head after nine are already banked.',
   2, 'seed-en-1', true),

  ('en',
   'Five people meet and each shakes hands exactly once with each of the others. How many handshakes happen?',
   '10',
   '["25", "20", "5"]'::jsonb,
   'Each of the 5 people shakes 4 hands, which counts 5 × 4 = 20 — but that counts every handshake twice, once from each end. So 20 / 2 = 10. "25" is 5 × 5 (letting people shake their own hands); "20" forgets the double-counting; "5" imagines them standing in a line.',
   2, 'seed-en-1', true),

  ('en',
   'What is the minimum number of ducks that can stand so that there is a duck in front of two ducks, a duck behind two ducks, and a duck between two ducks?',
   '3',
   '["5", "4", "6"]'::jsonb,
   'Three ducks in single file do all three jobs at once: the first stands in front of the other two, the last stands behind the other two, and the middle one is between two. The descriptions sound like three separate scenes needing their own ducks — they are one scene described three ways.',
   3, 'seed-en-1', true),

  ('en',
   'A brick weighs one kilogram plus half a brick. How much does the whole brick weigh?',
   '2 kilograms',
   '["1.5 kilograms", "1 kilogram", "3 kilograms"]'::jsonb,
   'Call the brick w: w = 1 + w/2, so w/2 = 1 and w = 2. Check: 1 kg plus half of 2 kg is 2 kg. "1.5" comes from reading "half a brick" as a fixed half-kilogram instead of half of the unknown being solved for.',
   3, 'seed-en-1', true),

  ('en',
   'On the first of January a girl says: "The day before yesterday I was 17, and next year I will turn 20." When is her birthday?',
   'December 31',
   '["January 1", "January 2", "It is impossible"]'::jsonb,
   'She speaks on January 1. The day before yesterday — December 30 — she was still 17. On December 31 she turned 18. THIS year, on December 31, she turns 19, and next year she turns 20. Every statement checks out only if the birthday is December 31 and the words are spoken on January 1 — the one date where "next year" stacks two birthdays away.',
   5, 'seed-en-1', true),

  ('en',
   'A rowing boat hangs a rope ladder over its side; the rungs are 30 cm apart and ten rungs are underwater at noon. The tide rises 90 cm by evening. How many rungs are underwater then?',
   'Still ten',
   '["Thirteen", "Seven", "Twelve"]'::jsonb,
   'The boat floats — as the tide rises, the boat and its ladder rise with it, and the ladder''s position relative to the water never changes. "Thirteen" (10 + 90/30) is the answer to a ladder bolted to the sea floor, which is the picture the question quietly invites you to draw.',
   2, 'seed-en-1', true),

  ('en',
   'You are given three boxes labeled APPLES, ORANGES, and MIXED — and told every label is wrong. Drawing just one fruit from one box, how do you relabel all three correctly?',
   'Draw from the box labeled MIXED; its fruit names it, and the other two swap',
   '["Draw from the box labeled APPLES", "Draw one fruit from each of two boxes", "It cannot be done with one draw"]'::jsonb,
   'The box labeled MIXED cannot be mixed, so the one fruit you draw from it names its true, single content — say apples. The box labeled ORANGES then cannot be oranges (its own label) and cannot be apples (taken), so it is mixed, and the last box is oranges. Starting from the APPLES box teaches you less: a drawn orange leaves two possibilities open. The power move is drawing from the label that is most completely a lie.',
   4, 'seed-en-1', true),

  ('en',
   'A rich eccentric offers a prize to the SLOWER camel: two riders must race, and the one whose camel crosses the line last wins. The riders stall for days until a passerby says two words that send both racing at full speed. What were they?',
   'Swap camels',
   '["Race backwards", "Start over", "Both win"]'::jsonb,
   'The prize goes to the owner of the slower camel. Riding your own camel, going fast can only hurt you. But on your rival''s camel, every bit of speed you squeeze out of it makes THEIR camel finish first — and your own camel, ridden by them, finish last and win you the prize. Swapping mounts flips each rider''s incentive from stalling to sprinting while changing nothing about whose camel wins.',
   5, 'seed-en-1', true),

  ('en',
   'A windowless room has one door and no lights. Ten people each hide a coin somewhere inside, one at a time, never seeing another''s hiding spot. Then each must find a coin — any coin — and the group succeeds only if everyone finds one. They may agree on a plan beforehand. What plan guarantees success?',
   'Everyone hides their coin in the same agreed spot',
   '["Everyone searches the room in the same direction", "Each person memorizes their own spot and retrieves their own coin", "Success cannot be guaranteed"]'::jsonb,
   'The freedom in the puzzle is that nobody needs to find their OWN coin. Agree on one spot in advance — say, just behind the door — and all ten coins end up in a single pile everyone can find by touch. "Retrieve your own coin" also works for finding, but the puzzle says each must FIND a coin after all ten have hidden; a shared pile is the plan that cannot fail for anyone, in the dark, with no memory demands.',
   4, 'seed-en-1', true)
) AS seed(language, question_text, correct_answer, incorrect_answers, explanation, difficulty, source, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM public.king_questions WHERE source = 'seed-en-1'
);

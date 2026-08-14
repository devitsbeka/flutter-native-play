-- Questions whose stem contained their own correct answer.
-- 32 rewritten, 7 retired.

BEGIN;

UPDATE public.questions AS t
   SET original_question_text = COALESCE(t.original_question_text, t.question_text),
       question_text = v.stem
  FROM (VALUES
    ('0ff09084', 'Which South Indian city is famous for its silk sarees?'),
    ('11076ce1', 'Which Oscar-winning actor founded a major climate foundation?'),
    ('1a8de50e', 'In Greek myth, who is Zagreus''s father?'),
    ('1e74e4af', 'Which word comes from the Greek for ''wanderer''?'),
    ('37a414d8', 'Which German art forger faked lost Expressionist works?'),
    ('423768dc', 'Which field drove the AI breakthroughs of the 2010s?'),
    ('4471a26e', 'What lies between the orbits of Mars and Jupiter?'),
    ('4ea799cf', 'What does the Mandela Effect describe?'),
    ('5c71b88a', 'Who wrote Liber Abaci, introducing his famous sequence?'),
    ('6019ef23', 'Which Norse god inspired a Marvel superhero directly?'),
    ('89493955', 'Which meme shows escalating levels of enlightenment?'),
    ('6fa3e1f8', 'Which video game adapts a board game about settling Mars?'),
    ('731e25f1', 'Which game series is known for open worlds and car crime?'),
    ('7536fb3a', 'Which arch type is the semicircle used in aqueducts?'),
    ('7766b59b', 'Which Netflix series has players risk death in kids'' games?'),
    ('839265f8', 'Which Australian state is an island off the south coast?'),
    ('eaa0d545', 'Which anime follows a young ninja of the Hidden Leaf?'),
    ('9ab46f11', 'Which threat splits wildlife range into isolated patches?'),
    ('aa1db77f', 'Which organization verifies and publishes record attempts?'),
    ('ac9a8395', 'Which SI unit measures energy?'),
    ('ad226283', 'Which showman played himself in a 1912 film of his life?'),
    ('ae3df1af', 'Which 1999 Disney movie features a computer-run home?'),
    ('bc809a0d', 'Which metal backed currencies under the classical standard?'),
    ('bfc2b271', 'In which Spanish city is Camp Nou located?'),
    ('c6bd6231', 'Which FOX series follows a young Jim Gordon''s early cases?'),
    ('ddf6f4e0', 'In which anime does Ash Ketchum catch monsters?'),
    ('e1597cfd', 'Which German city gave its name to a beef patty?'),
    ('e235fe0d', 'Where did the Pythia deliver Apollo''s prophecies?'),
    ('e3af0eda', 'Which event was read as an omen of a ruler''s fall?'),
    ('f1f0b772', 'Which part of an OS manages memory and hardware?'),
    ('fb185cb0', 'Which animal''s gallop inspired MIT''s running robots?'),
    ('fd0fbfc4', 'Which TV show follows a high school singing club?')
  ) AS v(id8, stem)
 WHERE t.language = 'en' AND left(t.id::text, 8) = v.id8;

UPDATE public.questions
   SET is_active = false, in_production = false,
       quality_status = 'retired_unfixable'
 WHERE language = 'en'
   AND left(id::text, 8) IN ('0d2bb675', '7478aba4', 'a86decf5', 'c8d11087', 'e636522f', '658941c3', '93f72020');

COMMIT;

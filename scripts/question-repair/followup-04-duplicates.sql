-- Retire 32 questions found by a second audit pass of the 7,494 live English
-- rows: 30 near-duplicates (same answer set, same correct answer, near-identical
-- wording), one corrupted row whose stem and answers are about different
-- subjects, and one wording fix.
--
-- Retire, not delete — nothing is lost, and a single UPDATE brings any of them
-- back. Ids are matched on their first 8 characters, which are unique across
-- production; that keeps the statement short enough to paste.

BEGIN;

UPDATE public.questions
   SET is_active = false,
       in_production = false,
       quality_status = 'retired_duplicate'
 WHERE language = 'en'
   AND left(id::text, 8) IN (
     '99400371','73b4306f','e81d769e','eaf711d3','c3a3c3d3','51bfb2f5',
     '0aaf4b67','c26421ff','5a693d28','6e694aff','24a4d2da','c7caa3e3',
     'f2a18e1e','041480db','f65b51ad','53463a4d','b9a0135c','16b9e4d1',
     'f3658218','df3b1ec2','13e091c3','e944142f','cd2b65fe','766beb84',
     '334a46a5','0fc1b106','3a5af2ea','43e967e2','5f9dba46','630aa2c3',
     '67992d00'
   );

-- faf947af: the stem asks which retailer the Navajo Nation sued, and the four
-- answers are audiology equipment ('BAER machine', 'Otoscope', 'Stethoscope',
-- 'Tuning fork'). Two unrelated questions were spliced together at some point.
-- Its correct twin (b81e6dee, 'Urban Outfitters') is already live, so this one
-- is retired rather than repaired.
UPDATE public.questions
   SET is_active = false,
       in_production = false,
       quality_status = 'retired_unfixable'
 WHERE language = 'en'
   AND left(id::text, 8) = 'faf947af';

-- a10d3378 survives the democracy pair, but reads as if a word is missing.
UPDATE public.questions
   SET original_question_text = COALESCE(original_question_text, question_text),
       question_text = 'Which system gives power to the people through elections?'
 WHERE language = 'en'
   AND left(id::text, 8) = 'a10d3378';

COMMIT;

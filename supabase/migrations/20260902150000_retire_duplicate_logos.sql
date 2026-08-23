-- Two carmakers that ended up in guess_logo twice.
--
-- The logo expansion refuses anything whose English answer is already in
-- the bank, and anything whose picture is. Wikidata got past both by
-- carrying the holding company separately from the marque:
--
--   live bank      expansion
--   Volkswagen     Volkswagen Group      (different file: the 2023 group mark)
--   Mercedes-Benz  Mercedes-Benz Group   (different file: the group mark)
--
-- Different strings, different pictures, same company. A player can now be
-- shown the VW roundel with both "ფოლკსვაგენი" and "Volkswagen AG" among the
-- four options, one of which is marked wrong.
--
-- The Mercedes row is worse than redundant: Wikidata's Georgian label for
-- Mercedes-Benz Group is "Daimler AG", so the card offers a name that is
-- neither the marque a Georgian player knows nor the one on the picture.
--
-- The marque is what belongs in a logo quiz, and the marque is what was
-- already there, so the group entries go. Retired rather than deleted, in
-- both cases with all seven languages, the same as any other retirement
-- here. The generator has been taught to normalise Group/AG/Inc/Ltd before
-- comparing, so this particular collision cannot come back.

BEGIN;

UPDATE public.questions
SET is_active = false
WHERE id IN (
  -- Mercedes-Benz Group (Q27530)
  'ee244c1a-bbad-5d6d-b442-7f30fffd70b8',  -- en
  '6c73b9dd-4d99-5e62-9640-8fdf950fe9c7',  -- ka  ("Daimler AG")
  'c2b9f377-84b6-586c-9d4c-b3140202f939',  -- de
  '363c3ee5-c8f6-5302-b8c7-39aa4d5ef8c0',  -- es
  '9b3a8a5e-f240-5c95-a95d-64d3ae074c21',  -- fr
  'c43d391c-fbad-5679-9e0c-c7c639f40cd5',  -- it
  '5a4551a5-5365-50ff-aa1a-deb1daaaad20',  -- pt
  -- Volkswagen Group (Q156578)
  '18185afc-4265-513c-979b-128be44ff558',  -- en
  'e23ac27a-5afb-5590-a213-51bcc6ab8b7c',  -- ka  ("Volkswagen AG")
  '1788d237-5001-5096-b001-13dac8e104e4',  -- de
  'a7092235-612f-5ab6-bdf4-cd120800517d',  -- es
  'cbae60dd-7c7c-59eb-9925-e9dcd8044459',  -- fr
  '3a8afad7-116f-5cec-aab7-25f1ade15a0c',  -- it
  '35b3e4c3-5cd1-5833-bd81-b8ed5f781d53'   -- pt
);

COMMIT;

-- English question bank repair, staged for review.
--
-- Two things happen here and neither one reaches players unreviewed:
--
--   1. Duplicates and unfixable questions are retired: is_active = false and
--      in_production = false. Nothing is deleted, so any of it can be brought
--      back with a single UPDATE. Where a duplicate was retired, the surviving
--      twin is named in the comment above it.
--
--   2. Repaired questions are rewritten and ALSO moved to the Library
--      (in_production = false). They show up in Question Studio's Library tab
--      for one review pass, then get promoted back with the existing bulk
--      "move to production" action.
--
-- Every rewrite keeps the original text in original_question_text /
-- original_correct_answer / original_incorrect_answers, so the studio can show
-- a before/after and a bad call can be reverted per question.
--
-- Targets are derived from what the game renders, not from the config
-- constants: questions <= 70 chars (the card stops shrinking at 18px and then
-- pushes answers into a scroll region), answers <= 20 where possible and never
-- past 48 (quiz-answer-button.tsx line-clamp-2 ellipsizes, and TV mode's
-- 2-column grid clips soonest).

BEGIN;

-- ── 1. retire duplicates and unfixable questions ──────────────────────

-- duplicate_conflicting: twins whose correct answers disagreed; the factually correct copy survives (31)
-- Can humans actually use 10 percent of their brain?
--   near-identical to df304a6c
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate_conflicting', updated_at = now() WHERE id = 'b625e909-ed99-4988-842b-5dfa4e5abc5d';
-- Can humans use only 10 percent of their brain?
--   near-identical to df304a6c
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate_conflicting', updated_at = now() WHERE id = '8dbe5332-2cf0-4fc6-bad1-e2d069eabf44';
-- Can humans use only 10 percent of their brains actually?
--   near-identical to df304a6c
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate_conflicting', updated_at = now() WHERE id = '1776e1e2-6b35-42b1-ad07-92242f027a72';
-- Did Vikings actually wear horned helmets in battle historically?
--   near-identical to bfd47cb4
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate_conflicting', updated_at = now() WHERE id = '07a8d836-0f8f-4890-8912-165e45566822';
-- Did Vikings actually wear horned helmets in battle?
--   near-identical to bfd47cb4
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate_conflicting', updated_at = now() WHERE id = 'b18cd125-cb9a-4ae5-b3e2-4119936ab3b5';
-- Did Vikings really wear horned helmets?
--   near-identical to bfd47cb4
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate_conflicting', updated_at = now() WHERE id = '31951ca9-7c2a-4f94-8b92-6a537a025488';
-- Do humans only use 10 percent of their brain capacity really?
--   near-identical to df304a6c
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate_conflicting', updated_at = now() WHERE id = 'af23d7ac-bea1-4083-8244-bf5893163e9e';
-- Do humans really use only 10% of their brain?
--   near-identical to df304a6c
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate_conflicting', updated_at = now() WHERE id = '04349aac-8408-4874-aa47-28d3db2d8b87';
-- Do humans typically use only 10% of their brains?
--   near-identical to df304a6c
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate_conflicting', updated_at = now() WHERE id = '5348f743-8f02-40b4-a9e7-c6e7b562247a';
-- Do humans use only 10% of their brain capacity?
--   near-identical to df304a6c
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate_conflicting', updated_at = now() WHERE id = '72076414-3558-48a8-bae0-6c28c06bac58';
-- Do we lose most body heat through our heads?
--   near-identical to ec0a63c5
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate_conflicting', updated_at = now() WHERE id = '4c90a451-6b12-4fdb-b00b-a7b70c704699';
-- Does sugar actually cause hyperactivity in children?
--   near-identical to 50c406c6
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate_conflicting', updated_at = now() WHERE id = '89b428b4-29f2-4d1d-8c8d-ca1de5fc27bc';
-- How long does it take light from the sun to reach Earth?
--   near-identical to bf1c3378
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate_conflicting', updated_at = now() WHERE id = 'a682544d-1774-42d2-86de-7757707609bc';
-- How many moons does Jupiter have as of 2024?
--   near-identical to 4c5e2e33
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate_conflicting', updated_at = now() WHERE id = 'a864844a-7540-448c-9bcf-8488dab70482';
-- What broke records as most spoken language by native speakers?
--   near-identical to 334a46a5
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate_conflicting', updated_at = now() WHERE id = '0d1d8038-c66f-4a06-a0b5-64dae77e8de4';
-- What is area formula of a circle?
--   near-identical to 601ef0a7
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate_conflicting', updated_at = now() WHERE id = '676e1e4c-bacc-4c98-a059-3178c5b390d5';
-- What is measure of light speed in vacuum?
--   near-identical to 24cf93e1
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate_conflicting', updated_at = now() WHERE id = '5708a1e5-ef01-4bea-ac35-083007752e66';
-- What is the speed of light in a vacuum?
--   near-identical to 24cf93e1
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate_conflicting', updated_at = now() WHERE id = '2d335545-4913-4228-ab22-175ab180b19a';
-- What is the speed of light in vacuum approximately?
--   near-identical to 24cf93e1
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate_conflicting', updated_at = now() WHERE id = '720fb607-07b6-4873-989e-940cb1295098';
-- What year was first artificial satellite launched?
--   near-identical to aa9a8350
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate_conflicting', updated_at = now() WHERE id = 'c9414b30-3270-4811-8b89-c2b4a62af087';
-- What's Instagram's original name?
--   near-identical to b05fc333
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate_conflicting', updated_at = now() WHERE id = 'dbeb87ed-00c7-4e1b-a0bc-24498ae60046';
-- When did TikTok first launch internationally?
--   near-identical to 2c230f50
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate_conflicting', updated_at = now() WHERE id = 'dfd9e776-083a-4656-bc7b-04b8a3d4e803';
-- Which European nation first banned the transatlantic slave trade?
--   near-identical to c5962ff4
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate_conflicting', updated_at = now() WHERE id = '87e07f47-e3c3-4aa7-b44c-42c37fbc96cb';
-- Which Olympic athlete won the most gold medals ever?
--   near-identical to 494a541f
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate_conflicting', updated_at = now() WHERE id = 'd5b9ddd0-ca68-4cd6-946a-4bfdd54a7f93';
-- Which country has the most time zones globally?
--   near-identical to 1df79c32
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate_conflicting', updated_at = now() WHERE id = '7d307f82-76d7-4f6c-a459-15dad934fcc0';
-- Which formula shows Ohm's law?
--   near-identical to c272015c
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate_conflicting', updated_at = now() WHERE id = 'a5a313e4-f833-4449-8228-c34cd42bce9e';
-- Which language has the most native speakers globally?
--   near-identical to 334a46a5
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate_conflicting', updated_at = now() WHERE id = '8520b539-9646-4b3d-bb83-2dca387bbaa0';
-- Which language is spoken by the most native speakers globally?
--   near-identical to 334a46a5
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate_conflicting', updated_at = now() WHERE id = '576f4eb6-de91-4528-84bf-3712a279a183';
-- Who directed the iconic 1975 film 'Jaws'?
--   near-identical to 52e06211
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate_conflicting', updated_at = now() WHERE id = 'a9894a3a-b357-4d1b-977c-03cb352c3b99';
-- Who holds the record for most Olympic gold medals?
--   near-identical to 494a541f
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate_conflicting', updated_at = now() WHERE id = 'ed152479-e56a-4ecf-8034-7065c8ae5182';
-- Who holds the record for most Olympic medals?
--   near-identical to 494a541f
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate_conflicting', updated_at = now() WHERE id = 'fd92b702-a94a-4cc0-a09f-1a548015f0fb';

-- duplicate: exact or near-identical twins; the better-formed copy survives (100)
-- How does microgravity affect an astronaut's bone density long-term?
--   near-identical to d502edc7
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '292e5319-de98-4c7b-9504-ef946a8b6f45';
-- How long can a goldfish's memory actually last?
--   near-identical to dcbf9804
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'a8c43fb4-3142-4647-9007-0c57358b662c';
-- How many bones adult human have?
--   near-identical to be6465bd
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'eb3778a4-82ad-47f0-a524-f3025085189b';
-- How many bones are in an adult human body?
--   near-identical to be6465bd
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '5fe8bd49-b70f-4f38-9106-092517c12993';
-- How many bones are in an adult human skeleton?
--   near-identical to be6465bd
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'd64d1949-a7eb-4e89-8396-e5324fe66498';
-- How many bones are in the adult human body?
--   near-identical to be6465bd
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'b1f6aa83-1303-4846-bc1a-42ef41472dee';
-- How many bones does an adult human have?
--   near-identical to be6465bd
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '708f9db2-1804-4c89-87b6-1e677b8b346f';
-- How many bones does an adult human skeleton contain normally?
--   near-identical to be6465bd
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'b6035691-e399-404e-88ee-bc3df29dbe22';
-- How many bones does an adult human skeleton contain?
--   near-identical to be6465bd
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '85e2a21f-4439-4556-81a2-c944259ea6c5';
-- How many chambers does a human heart typically have?
--   near-identical to 98a7f817
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '54561e72-d2ba-4279-b700-a89b3570ba4b';
-- How many chambers does the human heart have?
--   near-identical to 98a7f817
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '9d455c7c-17c2-496e-b5c3-b0352bce5a0e';
-- How many distinct muscles comprise the human tongue?
--   near-identical to 26fcc586
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'ccc82740-cf75-4ffd-9839-89774d92e57a';
-- How many elements are in the periodic table?
--   near-identical to 23cf6655
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '3d7311e8-65f4-4ffd-b1b7-38e5146c6f40';
-- How many hearts does an octopus have?
--   near-identical to 27e09330
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '632e0fb3-c3cb-4792-911d-703b76027dae';
-- How many hours of video are uploaded to YouTube every minute?
--   near-identical to 716449e7
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '7ad75354-2cd2-4ef9-9fdf-e7abab93f708';
-- How many moons does Mars actually have?
--   near-identical to 9ba05355
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'be8303dd-d493-4cd6-890d-8c1dfb8134ca';
-- How many players are on the field for one team at the start of a standard Association Football (soccer) match?
--   near-identical to c3a3c3d3
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'd6f7ef53-3da3-4d9b-9f90-73cf0490a120';
-- How many players in a rugby union team match?
--   near-identical to 9b9ac07c
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'fd03d46b-5f3f-47b5-ae2d-0e9dfb7e35c5';
-- How many players on field for one team in a soccer game?
--   near-identical to 12f805f7
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'ec8ab9ee-dfc6-464b-9d4d-6a724a29db0f';
-- How many players on field in Rugby Union team?
--   near-identical to 9b9ac07c
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '9e2138ef-2d13-41b4-b2fd-971cf1f2ead5';
-- How many players on field in soccer team at one time?
--   near-identical to 12f805f7
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '1144b3b3-56bc-452f-8f02-edd9a64a207f';
-- How many players on volleyball court per team?
--   near-identical to 5eb1c9f2
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '8d7aac09-ee0b-4d0b-8bd8-98238193c0d8';
-- How many sides does a triangle have?
--   near-identical to 19c80039
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'b6f5ea83-f2eb-4818-94e1-5971e1c0b597';
-- In a standard game of Rugby Union, how many players are on the field for one team at the start of the match?
--   near-identical to 9b9ac07c
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '16106329-397a-4723-8cd7-ee434dad52b3';
-- In what year did the Distracted Boyfriend meme start?
--   near-identical to 1726e1cb
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '65e4499e-d4fd-4054-bde1-9c23460a9d7e';
-- In what year was Big Ben's clock tower completed?
--   near-identical to 647ac2d0
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'a6e75b74-1fdf-4ad3-b9bd-7c1b245b80dc';
-- In what year was the FIFA World Cup first held?
--   near-identical to f0bccdc8
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '4874f084-9178-40c2-9c28-fa1c14247418';
-- In what year were the first modern Olympic Games held?
--   near-identical to 5af6d746
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '7f58afc6-1351-49d3-85d8-78a8f6838860';
-- In which year did World War II end?
--   near-identical to 40ed46ce
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '140a0243-f478-487c-8bf2-bb5348e521af';
-- The 'Doge' meme featured which dog breed?
--   near-identical to ba1d2b32
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '2f210775-3114-438c-b8e0-889f83cc64cb';
-- What 2020 meme showed a woman yelling at a cat?
--   near-identical to f71aab4a
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '518a1f49-6568-46f7-ab64-f8af76b660e2';
-- What AI system beat Garry Kasparov in chess in 1997?
--   near-identical to 3e4c1936
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'ea8606f9-cdb0-4e10-8123-c3a3fab83c08';
-- What band performed 'Bohemian Rhapsody'?
--   near-identical to 099da789
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'd2949f03-1879-4ae3-8f8b-75da2202b95f';
-- What blood type is considered the universal donor?
--   near-identical to 2d734f1b
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '44688c8c-7475-4828-8210-00b68a089d17';
-- What classification system did Carl Linnaeus develop?
--   near-identical to 13d2f3ae
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'e9b0b632-cc66-4218-ab47-3c8a783738ea';
-- What element is the most abundant in Earth's crust?
--   near-identical to b48445db
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '7332a810-2511-4ff2-9c6c-cbbb0fe84d00';
-- What instrument measures atmospheric pressure changes?
--   near-identical to ec5a6e4c
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '8a4a98e9-8c55-45c5-a3a0-854e85f21943';
-- What internet acronym means "Laughing Out Loud"?
--   near-identical to 13909d1a
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '03d5122a-46b8-4cd6-88cd-d69da0464cda';
-- What is TikTok's parent company named?
--   near-identical to f2cf4911
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '23f64906-31de-4cb7-a1f1-dc2cfb25451a';
-- What is chemical formula for water?
--   near-identical to 791d7558
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '263fe0bb-5d33-43e0-a687-cfc3abc0c94a';
-- What is chemical formula for water?
--   near-identical to 791d7558
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'b90ffd12-5391-48ad-b416-5b0d638ad879';
-- What is chemical formula for water?
--   near-identical to 791d7558
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'eba73542-4852-4ddb-b385-dc5a6c6a447a';
-- What is earliest social network?
--   near-identical to fa9e852f
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'e5577931-6936-43be-93ee-10c11857ddf8';
-- What is the 'powerhouse of the cell' called?
--   near-identical to ef8d977b
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '42ac35c0-c68e-4535-9dc2-dde82474ae3f';
-- What is the chemical symbol for gold?
--   near-identical to f622b5bf
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '994a01d1-503d-468f-a885-cdbffb8d1b8d';
-- What is the fastest land animal on Earth?
--   near-identical to 860c0aa1
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '513456b2-1562-4489-98b8-c1c5ae607fdd';
-- What is the fastest land animal?
--   near-identical to 860c0aa1
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'a8b0a511-04f6-493b-85cb-167666f97ca8';
-- What is the hottest known exoplanet?
--   near-identical to 8188adc3
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'cf2e6482-085f-4cae-a0cf-1caf93db43ec';
-- What is the largest single-digit number?
--   near-identical to 1ae3558c
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'a78dc2ef-3077-4ddc-8d79-cfd677f71824';
-- What is the most abundant element in Earth's crust by mass?
--   near-identical to b48445db
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '35e2de87-4b51-45cf-add4-af801250a866';
-- What is the most abundant element in Earth's crust?
--   near-identical to b48445db
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '90702ae7-f51f-4228-a05f-423f2ea005ff';
-- What is the smallest country in the world?
--   near-identical to 9f07ba20
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '62d135c7-f2b2-4d10-9ccd-3a790d45d0d0';
-- What is the square root of 144 in basic mathematics?
--   near-identical to e3098a12
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '33bc8bf8-ae0a-494d-b499-feee2ba69dde';
-- What is the value of pi rounded to two decimal places?
--   near-identical to a8ab09a8
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '956154e5-5a00-40c9-a1f8-fb8583416382';
-- What optical tool did Galileo use to observe Jupiter's moons?
--   near-identical to 746d2e83
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '08163744-7e1b-4009-8755-d946bd4eccb8';
-- What percentage of Earth's surface is water?
--   near-identical to 936ffc9f
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '772f8c4c-3036-465e-8427-36c2eaa305df';
-- What percentage of an average adult male's body weight is water?
--   near-identical to b4cfc8dc
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'b35fba9a-4b23-43e6-80f0-81fdd5f4612f';
-- What percentage of the human body is water?
--   near-identical to 4813bef8
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '167577fa-2387-4dfa-8e11-eeadf2db96f3';
-- What planet has the most moons?
--   near-identical to 6b59c9a5
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '7d20542b-f578-4694-ae58-f898379cb2b4';
-- What year did the Berlin Wall fall?
--   near-identical to 0cf8c4dd
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '60964972-9dd0-4c5a-8880-509c45388ac9';
-- What year was term "robot" coined?
--   near-identical to 1c976731
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'e1577d4e-be1c-4322-8304-5d41592ba698';
-- What year was the Statue of Liberty dedicated?
--   near-identical to 26867a17
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '619efa73-f216-4c45-b167-f70f5dcfeda5';
-- When did humans first land on the Moon chronologically?
--   near-identical to ffcdedc7
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'f6476e48-02a8-4983-8fa9-bc4909316dab';
-- When did the 'Rickroll' meme originate as an internet phenomenon?
--   near-identical to 377a6ce7
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '312274ba-5b52-421a-9043-8b4efe9a57b3';
-- Where is NATO headquarters geographically located?
--   near-identical to f1f01ce3
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '05146180-6b4e-47a3-ac77-ce63899deded';
-- Which ancient Roman city was buried by Vesuvius in 79 AD?
--   near-identical to 406a1173
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'c4281343-4d33-4882-b98f-3707fbe38b01';
-- Which animal produces the loudest sound in the animal kingdom?
--   near-identical to 185ca20b
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '8b49d45d-5c51-4e2b-a589-90dff6d359f7';
-- Which architect designed the Guggenheim Museum's spiral?
--   near-identical to 44298b20
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '286c8132-ed39-4145-9ed2-3a07df00be7b';
-- Which band released 'Bohemian Rhapsody'?
--   near-identical to 099da789
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '87776321-cc78-4cd1-9272-fbc97eff2f65';
-- Which blood type is considered universal donor?
--   near-identical to 2d734f1b
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'fc2d742a-dbc5-4037-8d3e-5e2d125a425a';
-- Which celebrity holds the record for most Instagram followers?
--   near-identical to e2fb664c
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '60a63284-f677-40bc-8b77-0e1e84bf3dcb';
-- Which company makes PlayStation consoles?
--   near-identical to cee6d7a4
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '06a35975-fb5b-44ae-99a9-a300cc6c546d';
-- Which company owns ASIMO robot?
--   near-identical to 1feadacd
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'b0492068-81df-4b02-8afd-929c8a963070';
-- Which computer scientist of The Art of Computer Programming won the 1974 Turing Award?
--   near-identical to 680ab972
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '2cf16aee-a563-4191-8736-d53cf2bebe1f';
-- Which country hosted most Summer Olympic Games historically?
--   near-identical to 9a9fd2bb
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '0cb12cee-c9e5-4e67-94c9-325dd9b5dbaf';
-- Which country leads in silicon chip manufacturing geographically?
--   near-identical to 4a8e4bbe
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '02a67672-7ad5-423c-83fd-acab2bd063a1';
-- Which country pioneered modern 'new Nordic' cuisine?
--   near-identical to 7f547df2
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '9f28c621-b3cb-4612-942c-139631f9f389';
-- Which gas comprises most of Earth's atmosphere by volume?
--   near-identical to 46bcca3b
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '9258a006-f29a-448b-8510-bbd308dd7667';
-- Which high-level programming language was released first?
--   near-identical to 4ade8e91
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'feb80ee0-1fad-4ed0-a145-5ee48ba52b16';
-- Which is only even prime number?
--   near-identical to 24a60403
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'a47952f0-2d31-4a5e-b45b-66c407cfd954';
-- Which large Roman city, famously preserved by volcanic ash, was buried by the eruption of Mount Vesuvius in 79 AD?
--   near-identical to efedbc00
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '74e06058-2ec9-423c-806e-fa1f1c3db5f2';
-- Which mammal has the highest mass-specific metabolic rate?
--   near-identical to 97fe31b8
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'a59e2fe0-b846-4667-a8d8-4a35d4fa63e9';
-- Which of these is the largest living animal by mass?
--   near-identical to 30335f6e
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'dd0285b3-c163-4937-962b-15960b2be7ac';
-- Which organism survived unprotected in outer space?
--   near-identical to bbfe4cad
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '6233845e-802a-4a6d-939e-b6f9afaa86bb';
-- Which organization designates World Heritage Sites?
--   near-identical to fa76eb37
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '9e79142f-a9dc-45ad-9722-fdc91df17edc';
-- Which planet has the most confirmed moons as of early 2024?
--   near-identical to 6b59c9a5
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'ab22c872-f766-41c2-9ee5-188c5e7ed81c';
-- Which planet has the most confirmed moons?
--   near-identical to 6b59c9a5
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'd1c88718-05a7-40e4-a187-e4b9981b2e69';
-- Which planet in our solar system has the greatest number of confirmed moons?
--   near-identical to 6b59c9a5
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'e2b7e7fd-a6a1-4b30-a8ff-8a434e373ba9';
-- Which planet in our solar system has the most confirmed moons?
--   near-identical to 6b59c9a5
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'e2b1d573-af9d-470e-a756-7f989682106a';
-- Which scientist developed the theory of relativity?
--   near-identical to aa0b74c1
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'b762c283-b6f4-4980-9b08-596af3e0c6c7';
-- Who declared 'I came, I saw, I conquered'?
--   near-identical to 4c1ee6a6
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'ac6142b9-29c1-4a9b-a4fd-e81923d689d2';
-- Who developed the periodic table of elements?
--   near-identical to 2c559e7c
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '11d99a47-322c-4189-87e5-c0ba6682733f';
-- Who established the germ theory of disease?
--   near-identical to c1a533ca
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '40c308b2-1782-4d83-bc41-56aeeca72486';
-- Who formulated the Law of Universal Gravitation?
--   near-identical to 38afbcdc
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'ec3e1760-b793-4e17-9758-9ba8230c0c0d';
-- Who holds the record for the most Grand Slam singles titles in the Open Era of men's tennis?
--   near-identical to bce99fcc
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'b4bb0a33-6fbc-4c27-a5a0-bcfa91f7daf3';
-- Who invented the modern basketball game?
--   near-identical to 8578245f
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '3cd5aff4-0680-4dba-9d16-1c1967986df1';
-- Who invented the telephone and held the first U.S. patent for it?
--   near-identical to 7da223c4
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '989098c1-2279-4384-bfd3-caf395d23a19';
-- Who proposed the theory of continental drift?
--   near-identical to 7ecce6da
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'e205275c-c8fa-4513-a13e-258a00cdd4f7';
-- Who said 'I came, I saw, I conquered' in political context?
--   near-identical to 4c1ee6a6
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '3219aac3-d060-4950-9c19-601cab045341';
-- Who was the first European to reach India by sea?
--   near-identical to aa8801ef
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'f3e2c338-ba66-4c80-9299-1a6157dbac4c';

-- unfixable: no correct question underneath — invented premise, unverifiable, or several true options (9)
-- According to the 2023 Kearney Global Services Location Index (GSLI), how many countries were evaluated?
--   unanswerable trivia: a single index's country count for one year
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_unfixable', updated_at = now() WHERE id = 'a5cc5ad0-8ece-4fb1-b9c3-ca20f2253e36';
-- Can humans actually see ultraviolet light with eye exercises?
--   wrong and nonsensical: aphakic people do see UV; "eye exercises" is not a real premise
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_unfixable', updated_at = now() WHERE id = 'f3a221d6-ff40-48b0-a709-ff5dae781eef';
-- How many Grammy Awards has Beyoncé won in total?
--   stale and self-defeating: answer is 35 since Feb 2025, and 35 is a distractor
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_unfixable', updated_at = now() WHERE id = 'cb44da4f-f959-4b97-b878-7533782b314d';
-- Most common difficulty levels from easiest to hardest?
--   arbitrary: no defensible "most common" ordering of difficulty levels
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_unfixable', updated_at = now() WHERE id = '1343aae1-313d-4f6f-bb7b-cf4af12a27df';
-- TikTok's algorithm mimics which animal's herd behavior?
--   invented premise: TikTok's algorithm does not model starling murmuration
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_unfixable', updated_at = now() WHERE id = '3b2ba59b-663f-4488-be11-68ef8741e1c8';
-- Which feline trait best explains conflict in "Tiger King"?
--   false premise: the conflict in Tiger King is between people, not cats
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_unfixable', updated_at = now() WHERE id = '8b5298c7-8100-4931-a297-5cf8693339ac';
-- Which museum banned selfie sticks due to the 2010s craze?
--   multiple options true: the Met, Guggenheim and Tate all banned selfie sticks
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_unfixable', updated_at = now() WHERE id = '3d1c7e1a-3b30-4dca-ba32-8a831640058a';
-- Which released first: The Dark Knight or Iron Man?
--   ambiguous: marked Iron Man, but both films are 2008 and "Same year" is offered
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_unfixable', updated_at = now() WHERE id = '0acb1e18-8b43-4be2-b19d-06383de24be0';
-- Who said 'Cooking is like making love'?
--   unverifiable quote attribution
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_unfixable', updated_at = now() WHERE id = '8982ce69-df21-4845-90b3-741bd3429666';


-- ── 2. repaired and cleared for production (128) ─────────────
-- Every hard check passed and nothing needs a second opinion. These rows
-- were already being served; they are the same questions, shorter.

-- According to 1988 radiocarbon dating, in which century was the Shroud of Turin likely made?
--   trimmed by rule: question 91->53 chars, answers 12->4 chars
UPDATE public.questions SET
    question_text = 'In which century was the Shroud of Turin likely made?',
    correct_answer = '14th',
    incorrect_answers = '["1st", "10th", "18th"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '53e33891-73c9-4744-9826-6428e4d352f6';

-- According to Carol Dweck, which of the following best describes the 'false growth mindset' misconception?
--   hand-rewritten: question 105->45 chars, answers 82->20 chars
UPDATE public.questions SET
    question_text = 'What is Carol Dweck''s ''false growth mindset''?',
    correct_answer = 'Praising only effort',
    incorrect_answers = '["Fixed intelligence", "Just open-mindedness", "Theory is disproven"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '09158ae2-ccfd-4818-b59a-dd45cc0c09be';

-- According to NOAA, about what percent of Earth’s oxygen comes from marine photosynthesis?
--   trimmed by rule: question 89->70 chars
UPDATE public.questions SET
    question_text = 'About what percent of Earth’s oxygen comes from marine photosynthesis?',
    correct_answer = '50%',
    incorrect_answers = '["20%", "80%", "95%"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '75ebe21a-628c-4967-b0e2-2059bedcfeb4';

-- According to Norse mythology, what material was Thor's hammer, Mjolnir, primarily made of?
--   trimmed by rule: question 90->60 chars
UPDATE public.questions SET
    question_text = 'What material was Thor''s hammer, Mjolnir, primarily made of?',
    correct_answer = 'Iron',
    incorrect_answers = '["Stone", "Magical ice", "Wood"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '2e8f77ae-9317-459e-8ee3-9b7a857a87de';

-- According to Similarweb (2023), which AI chatbot had the most visits from Middle Eastern users?
--   trimmed by rule: question 95->63 chars
UPDATE public.questions SET
    question_text = 'Which AI chatbot had the most visits from Middle Eastern users?',
    correct_answer = 'ChatGPT',
    incorrect_answers = '["Bard", "Claude", "Copilot"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '9ac0208c-1831-4b65-88e8-f4bba23c0cf1';

-- According to the Bureau of Labor Statistics, what has been the average U.S. unemployment rate since 1948?
--   trimmed by rule: question 105->60 chars
UPDATE public.questions SET
    question_text = 'What has been the average U.S. unemployment rate since 1948?',
    correct_answer = '5.7%',
    incorrect_answers = '["3.5%", "8.2%", "6.5%"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'b961bc9a-232a-45db-8cbc-92d168fd056c';

-- Approximately when did the last giant ground sloths go extinct on the North American mainland?
--   hand-rewritten: question 94->54 chars, answers 26->16 chars
UPDATE public.questions SET
    question_text = 'When did giant ground sloths die out in North America?',
    correct_answer = '10,000 years ago',
    incorrect_answers = '["5,000 years ago", "15,000 years ago", "2,000 years ago"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '0871e16c-ebd0-4edd-b45f-57392108001b';

-- As of early 2024, which Instagram post held the record for the most likes of all time?
--   hand-rewritten: question 86->45 chars, answers 52->20 chars
UPDATE public.questions SET
    question_text = 'Which Instagram post has the most likes ever?',
    correct_answer = 'Ronaldo at Al Nassr',
    incorrect_answers = '["Messi World Cup win", "The World Record Egg", "Kylie Jenner''s baby"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '13649b50-d84d-4203-b80b-d69f978fd631';

-- Based on common scientific theories, why might a shark release a human after an initial exploratory bite?
--   hand-rewritten: question 105->54 chars, answers 117->19 chars
UPDATE public.questions SET
    question_text = 'Why might a shark release a human after one test bite?',
    correct_answer = 'Too little body fat',
    incorrect_answers = '["Human blood repels", "Human skin is toxic", "Sharks see poorly"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '08fd0cc7-16e9-406d-9104-b58f61e24661';

-- Basel's "central bank of central banks" institution?
--   trimmed by rule: answers 40->10 chars
UPDATE public.questions SET
    question_text = 'Basel''s "central bank of central banks" institution?',
    correct_answer = 'BIS',
    incorrect_answers = '["IMF", "World Bank", "WTO"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'b8ed16c7-c469-40b3-8bef-46b4881c53b9';

-- Did Gothic architecture originate with the Goths?
--   hand-rewritten: answers 63->20 chars
UPDATE public.questions SET
    question_text = 'Did Gothic architecture originate with the Goths?',
    correct_answer = 'No, a later insult',
    incorrect_answers = '["Yes, the Visigoths", "Yes, in Gothic Italy", "No, it was Roman"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '0da3b652-8985-45ea-9951-e061385b6750';

-- Did speakers of Classical Latin pronounce their language in the same way as modern Italian speakers pronounce theirs?
--   hand-rewritten: question 117->46 chars, answers 99->20 chars
UPDATE public.questions SET
    question_text = 'Did Classical Latin sound like modern Italian?',
    correct_answer = 'No, vowels differed',
    incorrect_answers = '["Yes, nearly the same", "No, more like French", "Nobody knows at all"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '151c994d-5c34-4f55-89d1-ba122492642d';

-- Earth's magnetic field strength: poles vs. equator percentage?
--   trimmed by rule: answers 35->4 chars
UPDATE public.questions SET
    question_text = 'Earth''s magnetic field strength: poles vs. equator percentage?',
    correct_answer = '200%',
    incorrect_answers = '["50%", "100%", "300%"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'cbe1d092-b794-4f86-938f-8ec76c43b8c2';

-- Elephant tusks are primarily composed of which specialized biological material?
--   trimmed by rule: question 79->69 chars
UPDATE public.questions SET
    question_text = 'Elephant tusks are composed of which specialized biological material?',
    correct_answer = 'Dentin',
    incorrect_answers = '["Enamel", "Bone", "Keratin"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '73675577-a98e-497d-9e86-81bc50f498cf';

-- Example of an optical disk?
--   hand-rewritten: question 27->34 chars, answers 11->11 chars
UPDATE public.questions SET
    question_text = 'Which of these is an optical disc?',
    correct_answer = 'CD-ROM',
    incorrect_answers = '["Flash drive", "Hard disk", "SD card"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '08951dff-4695-4ec5-8490-0f25ecabffe0';

-- First organism to complete its life cycle in space?
--   trimmed by rule: answers 34->20 chars
UPDATE public.questions SET
    question_text = 'First organism to complete its life cycle in space?',
    correct_answer = 'Arabidopsis thaliana',
    incorrect_answers = '["Zinnia elegans", "Triticum aestivum", "Lactuca sativa"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '5b3ac9b3-a8ca-4c94-a860-8fa6ea967c37';

-- Goldfish actually have memory spans longer than commonly believed. How long?
--   trimmed by rule: question 76->67 chars
UPDATE public.questions SET
    question_text = 'Goldfish have memory spans longer than commonly believed. How long?',
    correct_answer = 'Three months or more',
    incorrect_answers = '["One week only", "Ten days maximum", "One month exactly"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '71e6dcc3-0b06-42a1-9ee9-27bd1d00259c';

-- How do changes in interest rates directly impact the monthly payment amount for a personal loan?
--   hand-rewritten: question 96->51 chars, answers 58->18 chars
UPDATE public.questions SET
    question_text = 'How do higher interest rates change a loan payment?',
    correct_answer = 'They raise it',
    incorrect_answers = '["They lower it", "No effect at all", "They set principal"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '1669c8c7-1b24-493f-8e77-f9591b588eed';

-- How do modern smartphone touchscreens primarily detect your finger's input?
--   trimmed by rule: question 75->65 chars
UPDATE public.questions SET
    question_text = 'How do modern smartphone touchscreens detect your finger''s input?',
    correct_answer = 'Capacitance Change',
    incorrect_answers = '["Light Intensity", "Pressure Applied", "Thermal Change"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '87646b6f-09c1-49f8-89bb-d0b21dc2ddb6';

-- How do still images create continuous film motion?
--   trimmed by rule: answers 18->14 chars
UPDATE public.questions SET
    question_text = 'How do still images create continuous film motion?',
    correct_answer = 'Phi Phenomenon',
    incorrect_answers = '["Weber''s Law", "Snell''s Law", "Hooke''s Law"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '40010231-cdbd-44cc-94af-83940787806a';

-- How many exoplanets were confirmed between 1992 and Jan 2024?
--   trimmed by rule: answers 23->15 chars
UPDATE public.questions SET
    question_text = 'How many exoplanets were confirmed between 1992 and Jan 2024?',
    correct_answer = '5,500 and 5,600',
    incorrect_answers = '["1,000 and 1,500", "3,000 and 3,500", "7,500 and 8,000"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '54696764-d95a-474d-b38d-045f1772a939';

-- How many times faster is light compared to sound in dry air?
--   trimmed by rule: answers 21->9 chars
UPDATE public.questions SET
    question_text = 'How many times faster is light compared to sound in dry air?',
    correct_answer = '870,000',
    incorrect_answers = '["50,000", "100,000", "1,000,000"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'e17c32ef-a082-497d-9767-6ca85167d6c1';

-- How many unique Chinese characters are in the Kangxi Dictionary?
--   trimmed by rule: answers 24->6 chars
UPDATE public.questions SET
    question_text = 'How many unique Chinese characters are in the Kangxi Dictionary?',
    correct_answer = '47,000',
    incorrect_answers = '["5,000", "10,000", "85,000"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '1bc78d0c-cdf6-4f3d-8930-27dddbd04422';

-- Human gene mapping project completed in 2003 was what?
--   trimmed by rule: answers 26->14 chars
UPDATE public.questions SET
    question_text = 'Human gene mapping project completed in 2003 was what?',
    correct_answer = 'Human Genome',
    incorrect_answers = '["Human Proteome", "ENCODE", "1000 Genomes"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'c4c37a04-ec05-4cec-8534-7e7a99b56502';

-- In Greek mythology, which god is considered the king of the Olympian gods?
--   trimmed by rule: question 74->63 chars
UPDATE public.questions SET
    question_text = 'In Greek mythology, which god is the king of the Olympian gods?',
    correct_answer = 'Zeus',
    incorrect_answers = '["Apollo", "Poseidon", "Hades"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '767e351e-7447-4c8b-a997-5fa6b20ce63e';

-- In Indian mythology, which specific deity is the peacock most famously associated with as a mount or vahana?
--   hand-rewritten: question 108->44 chars, answers 19->9 chars
UPDATE public.questions SET
    question_text = 'In Indian myth, which deity rides a peacock?',
    correct_answer = 'Kartikeya',
    incorrect_answers = '["Vishnu", "Shiva", "Brahma"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '1058ec8c-86b9-4eef-8500-7d1bbf93a5fd';

-- In Western normative ethics, which three frameworks are most commonly cited as the primary independent traditions?
--   hand-rewritten: question 114->55 chars, answers 62->20 chars
UPDATE public.questions SET
    question_text = 'Which three traditions anchor Western normative ethics?',
    correct_answer = 'Virtue, duty, ends',
    incorrect_answers = '["Moral relativism", "Care and duty ethics", "Hedonism, nihilism"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '17c35e85-951f-481f-8017-688bc7de2780';

-- In basketball, which of the following illegal actions primarily involves illegal physical contact with an opponent?
--   hand-rewritten: question 115->56 chars
UPDATE public.questions SET
    question_text = 'In basketball, what is illegal contact with an opponent?',
    correct_answer = 'Foul',
    incorrect_answers = '["Violation", "Technical", "Traveling"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '18078dc8-f14d-4c29-a769-a8ac96d6c50c';

-- In historical folklore and superstition, what tool was popularly believed to help miners locate hidden ore deposits?
--   hand-rewritten: question 116->49 chars
UPDATE public.questions SET
    question_text = 'What tool did folklore say could find hidden ore?',
    correct_answer = 'Dowsing rod',
    incorrect_answers = '["Compass", "Pickaxe", "Safety lamp"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '06d305dd-7007-486d-a58c-cfd66b1e1632';

-- In taxonomic notation, what comes between genus and species?
--   trimmed by rule: answers 18->7 chars
UPDATE public.questions SET
    question_text = 'In taxonomic notation, what comes between genus and species?',
    correct_answer = 'Nothing',
    incorrect_answers = '["dash", "colon", "comma"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'd5c6c39f-3ab4-4b68-bb3f-701a50beb2a1';

-- In the Hindu Trimurti, which deity is traditionally known as the Preserver of the universe?
--   hand-rewritten: question 91->44 chars
UPDATE public.questions SET
    question_text = 'In the Hindu Trimurti, who is the Preserver?',
    correct_answer = 'Vishnu',
    incorrect_answers = '["Shiva", "Brahma", "Ganesha"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '065dbed6-25aa-4fed-9d99-4c8377016f78';

-- In the context of retail risk profiling for investors, which set represents common risk tolerance levels?
--   hand-rewritten: question 105->47 chars, answers 38->19 chars
UPDATE public.questions SET
    question_text = 'Which set lists investor risk tolerance levels?',
    correct_answer = 'Low to speculative',
    incorrect_answers = '["Equity, debt, other", "Grade to distressed", "Short to long term"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '161a3a55-e58c-40de-9337-979d89086c5d';

-- In the field of psychology, what is the general consensus regarding the reliability of 'recovered' repressed memories?
--   hand-rewritten: question 118->53 chars, answers 49->18 chars
UPDATE public.questions SET
    question_text = 'How reliable does psychology find recovered memories?',
    correct_answer = 'Largely unreliable',
    incorrect_answers = '["Always accurate", "Only for childhood", "Proven consistent"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '11c25707-d4a1-44a4-ad20-0765da4e8615';

-- In which country are the oldest continental rocks found?
--   trimmed by rule: answers 22->12 chars
UPDATE public.questions SET
    question_text = 'In which country are the oldest continental rocks found?',
    correct_answer = 'Australia',
    incorrect_answers = '["Canada", "Greenland", "South Africa"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'df31037c-7b3e-48cd-bcb5-2198e06a41d6';

-- In which country was ByteDance, the parent company that developed TikTok, originally founded?
--   hand-rewritten: question 93->56 chars
UPDATE public.questions SET
    question_text = 'Which country is TikTok''s parent company ByteDance from?',
    correct_answer = 'China',
    incorrect_answers = '["South Korea", "Japan", "Singapore"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '018ab763-830c-44d7-83a9-4ef2c538e611';

-- Is the Great Wall of China visible to the unaided human eye from Earth's orbit?
--   hand-rewritten: question 79->54 chars, answers 50->18 chars
UPDATE public.questions SET
    question_text = 'Is the Great Wall visible to the naked eye from orbit?',
    correct_answer = 'No, far too narrow',
    incorrect_answers = '["Yes, clearly", "Only via telescope", "Only from the ISS"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '068d838e-8de5-48dc-a500-a43d34437842';

-- Is the teleportation of macroscopic objects achievable with current scientific and technological capabilities?
--   hand-rewritten: question 110->41 chars, answers 45->20 chars
UPDATE public.questions SET
    question_text = 'Can science teleport large objects today?',
    correct_answer = 'No, not possible',
    incorrect_answers = '["Yes, by entanglement", "Only dead matter", "Only short distances"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '0b30b029-712f-41f9-881f-50b49799ef1c';

-- Pitch JND for trained listeners (cents)?
--   trimmed by rule: answers 24->3 chars
UPDATE public.questions SET
    question_text = 'Pitch JND for trained listeners (cents)?',
    correct_answer = '5',
    incorrect_answers = '["25", "50", "100"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '539d16f4-cac3-45aa-afba-be634ef072c7';

-- What Catholic practice fueled the Protestant Reformation?
--   trimmed by rule: answers 23->20 chars
UPDATE public.questions SET
    question_text = 'What Catholic practice fueled the Protestant Reformation?',
    correct_answer = 'sale of indulgences',
    incorrect_answers = '["Veneration of saints", "Papal infallibility", "Transubstantiation"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'cec55ac4-23c2-4e53-83e8-393224a20e47';

-- What animal was first cloned from adult cells?
--   trimmed by rule: answers 13->5 chars
UPDATE public.questions SET
    question_text = 'What animal was first cloned from adult cells?',
    correct_answer = 'Sheep',
    incorrect_answers = '["Mouse", "Cow", "Goat"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '5bbf00c0-692c-413f-a504-be1cdcc41e0f';

-- What causes light to change direction between mediums?
--   trimmed by rule: answers 37->12 chars
UPDATE public.questions SET
    question_text = 'What causes light to change direction between mediums?',
    correct_answer = 'Refraction',
    incorrect_answers = '["Reflection", "Polarization", "Diffraction"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'f901a3b1-71a2-41d2-ad45-d619889dfabe';

-- What does stellar parallax measure in astronomical observation?
--   trimmed by rule: answers 25->20 chars
UPDATE public.questions SET
    question_text = 'What does stellar parallax measure in astronomical observation?',
    correct_answer = 'Distance from Earth',
    incorrect_answers = '["Brightness intensity", "Rotation speed", "Chemical composition"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'ce0930db-3803-4f1d-82d2-f171d0c34f9e';

-- What effect, linked to Jaws, caused public shark fear and overfishing?
--   trimmed by rule: answers 22->18 chars
UPDATE public.questions SET
    question_text = 'What effect, linked to Jaws, caused public shark fear and overfishing?',
    correct_answer = 'Jaws Effect',
    incorrect_answers = '["Spielberg Syndrome", "Ocean''s Curse", "Deep Blue Panic"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'af9dddc0-45a5-4315-9954-d69cbd7c50ca';

-- What is the escape velocity at a black hole's event horizon?
--   hand-rewritten: answers 70->19 chars
UPDATE public.questions SET
    question_text = 'What is the escape velocity at a black hole''s event horizon?',
    correct_answer = 'Exactly light speed',
    incorrect_answers = '["Half of light speed", "Twice light speed", "Zero velocity"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '029011b1-afa2-46de-b1be-99dd4b534c6d';

-- What is the general Spanish name for the traditional Basque sport that involves hitting a ball against a wall?
--   hand-rewritten: question 110->52 chars
UPDATE public.questions SET
    question_text = 'What is the Spanish name for Basque wall-ball sport?',
    correct_answer = 'Pelota Vasca',
    incorrect_answers = '["Jai alai", "Frontenis", "Squash"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '13200731-a5cd-4b82-adb2-1dc1077b5919';

-- What is the primary setting for the social and romantic interactions in the TV show Friends?
--   hand-rewritten: question 92->55 chars, answers 31->14 chars
UPDATE public.questions SET
    question_text = 'Which coffee house do the ''Friends'' regulars gather in?',
    correct_answer = 'Central Perk',
    incorrect_answers = '["Cafe Nervosa", "Luke''s Diner", "MacLaren''s Pub"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '17b7066f-3847-4159-9210-182eb3563e02';

-- What is the scientific consensus regarding the existence of Atlantis?
--   hand-rewritten: answers 57->20 chars
UPDATE public.questions SET
    question_text = 'What is the scientific consensus regarding the existence of Atlantis?',
    correct_answer = 'No evidence exists',
    incorrect_answers = '["Digs confirmed it", "Texts document it", "Widely accepted fact"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '17a2b786-fcdb-4504-b893-61da77634b27';

-- What meme format shows Drake's approval/disapproval?
--   trimmed by rule: answers 28->19 chars
UPDATE public.questions SET
    question_text = 'What meme format shows Drake''s approval/disapproval?',
    correct_answer = 'Drake Hotline Bling',
    incorrect_answers = '["Expanding Brain", "This Is Fine dog", "Surprised Pikachu"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'c46848c8-b240-4d62-be3e-8f08f825e790';

-- What notation system ranks historical rulers by dynastic order?
--   trimmed by rule: answers 27->19 chars
UPDATE public.questions SET
    question_text = 'What notation system ranks historical rulers by dynastic order?',
    correct_answer = 'Roman numerals',
    incorrect_answers = '["Arabic numerals", "Greek letters", "Latin abbreviations"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'be559388-c3c0-47a5-abbd-f3dc277293ec';

-- What record did the Antikythera mechanism set when discovered?
--   trimmed by rule: answers 26->19 chars
UPDATE public.questions SET
    question_text = 'What record did the Antikythera mechanism set when discovered?',
    correct_answer = 'Analog computer',
    incorrect_answers = '["Bronze artifact", "Mechanical clock", "Astronomical device"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '7260c1e6-2cbc-4103-9cef-4d565d5336d9';

-- What scale measures mineral hardness by scratch resistance?
--   trimmed by rule: answers 23->17 chars
UPDATE public.questions SET
    question_text = 'What scale measures mineral hardness by scratch resistance?',
    correct_answer = 'Mohs hardness',
    incorrect_answers = '["Richter magnitude", "Beaufort wind", "pH acidity"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'fce29fe6-3d73-48ab-881e-558137c75854';

-- What system classifies historical time periods into ages?
--   trimmed by rule: answers 36->20 chars
UPDATE public.questions SET
    question_text = 'What system classifies historical time periods into ages?',
    correct_answer = 'Three-age system',
    incorrect_answers = '["Dynasty numbering", "Century division", "Event-based timeline"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '28dc50b8-ef95-4bac-a3a1-9152845c513b';

-- What terminology describes a pointed arch in medieval architecture?
--   trimmed by rule: answers 21->16 chars
UPDATE public.questions SET
    question_text = 'What terminology describes a pointed arch in medieval architecture?',
    correct_answer = 'Ogival or Gothic',
    incorrect_answers = '["Romanesque", "Byzantine", "Saracenic"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '36e6d378-4f8b-47c4-8aeb-0a75ecc91045';

-- What thought experiment did Descartes use for extreme doubt?
--   trimmed by rule: answers 38->16 chars
UPDATE public.questions SET
    question_text = 'What thought experiment did Descartes use for extreme doubt?',
    correct_answer = 'Evil Demon',
    incorrect_answers = '["Dream Argument", "Cogito, ergo sum", "Wax Argument"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '2e0eef9c-1399-4dd8-a7fe-f78c65179674';

-- What was the deceptive wooden structure used by the Achaeans to infiltrate the city of Troy?
--   hand-rewritten: question 92->50 chars, answers 24->18 chars
UPDATE public.questions SET
    question_text = 'What wooden structure let the Achaeans enter Troy?',
    correct_answer = 'The Trojan Horse',
    incorrect_answers = '["Labyrinth of Crete", "Walls of Jericho", "Colossus of Rhodes"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '04b1fa2d-e388-4798-91ae-ab9e286dd46a';

-- What workplace trend had many employees leave jobs after 2020?
--   trimmed by rule: answers 21->17 chars
UPDATE public.questions SET
    question_text = 'What workplace trend had many employees leave jobs after 2020?',
    correct_answer = 'Great Resignation',
    incorrect_answers = '["Hot desking", "Open-plan offices", "Job sharing"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'f0c54a86-7083-4728-bcf5-67c1cf2ac50a';

-- What's the estimated max lifespan of a Greenland shark?
--   trimmed by rule: answers 23->9 chars
UPDATE public.questions SET
    question_text = 'What''s the estimated max lifespan of a Greenland shark?',
    correct_answer = '400 years',
    incorrect_answers = '["150 years", "250 years", "600 years"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '70799373-abda-4911-8a69-6f4bae392812';

-- When viewing a film's runtime on a major streaming platform like Netflix or Hulu, how is it typically notated?
--   hand-rewritten: question 110->56 chars, answers 37->17 chars
UPDATE public.questions SET
    question_text = 'How do streaming services usually show a film''s runtime?',
    correct_answer = 'Hours and minutes',
    incorrect_answers = '["Total minutes", "Decimal hours", "Frame count"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '0d85aac8-69a8-406b-bd0a-6ff03b526b5f';

-- Where is Earth's largest crustal magnetic anomaly located?
--   trimmed by rule: answers 23->19 chars
UPDATE public.questions SET
    question_text = 'Where is Earth''s largest crustal magnetic anomaly located?',
    correct_answer = 'Kursk, Russia',
    incorrect_answers = '["North Magnetic Pole", "Mariana Trench", "Mount Everest"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '5ffb4022-83e6-4db1-a3d3-50d6454a4948';

-- Where is the world's largest active volcano located?
--   trimmed by rule: answers 18->11 chars
UPDATE public.questions SET
    question_text = 'Where is the world''s largest active volcano located?',
    correct_answer = 'Hawaii',
    incorrect_answers = '["Indonesia", "Iceland", "Philippines"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '9df1a9c3-e773-4cd4-9cbe-f58fccc78757';

-- Which 1922 archaeological discovery sparked global interest in ancient Egypt and inspired adventure films?
--   hand-rewritten: question 106->54 chars, answers 18->20 chars
UPDATE public.questions SET
    question_text = 'Which 1922 find sparked global fascination with Egypt?',
    correct_answer = 'Tutankhamun''s tomb',
    incorrect_answers = '["The Rosetta Stone", "The ruins of Pompeii", "Linear B tablets"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '05814d57-39b3-4387-b253-c67524a02a18';

-- Which 1940 bridge collapsed due to aeroelastic flutter?
--   trimmed by rule: answers 21->14 chars
UPDATE public.questions SET
    question_text = 'Which 1940 bridge collapsed due to aeroelastic flutter?',
    correct_answer = 'Tacoma Narrows',
    incorrect_answers = '["Millennium", "Golden Gate", "Brooklyn"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '0824d9af-3830-43c3-be69-e5255f8dd745';

-- Which 1998 U.S. law manages online copyright infringement?
--   trimmed by rule: answers 41->4 chars
UPDATE public.questions SET
    question_text = 'Which 1998 U.S. law manages online copyright infringement?',
    correct_answer = 'DMCA',
    incorrect_answers = '["GDPR", "CDA", "SOPA"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '61176d3d-779b-4c79-a7b0-f52400c3dc99';

-- Which 2005 le Carré film follows a diplomat probing his wife’s murder?
--   trimmed by rule: answers 21->17 chars
UPDATE public.questions SET
    question_text = 'Which 2005 le Carré film follows a diplomat probing his wife’s murder?',
    correct_answer = 'Constant Gardener',
    incorrect_answers = '["Side Effects", "Total Recall", "Contagion"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'ff833924-2797-4c4f-a2d0-366ecdfcc809';

-- Which 20th-century treaty ended WWI but led to WWII?
--   trimmed by rule: answers 23->13 chars
UPDATE public.questions SET
    question_text = 'Which 20th-century treaty ended WWI but led to WWII?',
    correct_answer = 'Versailles',
    incorrect_answers = '["Paris", "Brest-Litovsk", "Lausanne"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'e2e20fb9-c225-4401-9c40-c1c73b513951';

-- Which AI chatbot faced a major controversy over biased responses?
--   trimmed by rule: answers 15->5 chars
UPDATE public.questions SET
    question_text = 'Which AI chatbot faced a major controversy over biased responses?',
    correct_answer = 'Tay',
    incorrect_answers = '["ELIZA", "ALICE", "Siri"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '1fb44bcc-fa92-4a08-9f86-d33742dea09a';

-- Which AI chatbot generated offensive outputs and faced backlash?
--   trimmed by rule: answers 15->6 chars
UPDATE public.questions SET
    question_text = 'Which AI chatbot generated offensive outputs and faced backlash?',
    correct_answer = 'Tay',
    incorrect_answers = '["GPT-2", "ELIZA", "Clippy"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '11197666-e726-46d2-aa18-a68d3945e8cc';

-- Which Japanese fish nearly caused mass poisoning incidents?
--   trimmed by rule: answers 17->8 chars
UPDATE public.questions SET
    question_text = 'Which Japanese fish nearly caused mass poisoning incidents?',
    correct_answer = 'Fugu',
    incorrect_answers = '["Tuna", "Mackerel", "Salmon"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '89cf12dd-4434-4595-b5a7-9b793c8b8976';

-- Which Mars rover used the Sky Crane maneuver?
--   trimmed by rule: answers 38->11 chars
UPDATE public.questions SET
    question_text = 'Which Mars rover used the Sky Crane maneuver?',
    correct_answer = 'Curiosity',
    incorrect_answers = '["Spirit", "Opportunity", "Sojourner"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '66a29752-7bbc-423a-94ae-3956dd30e633';

-- Which Mesopotamian clay tablet is the earliest known medical treatise?
--   trimmed by rule: answers 23->19 chars
UPDATE public.questions SET
    question_text = 'Which Mesopotamian clay tablet is the earliest known medical treatise?',
    correct_answer = 'Diagnostic Handbook',
    incorrect_answers = '["Epic of Gilgamesh", "Code of Hammurabi", "Ebers Papyrus"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '06595c2d-6cf9-4b43-a9f3-a91da73a4171';

-- Which NASA center explores the solar system with robots?
--   trimmed by rule: answers 34->4 chars
UPDATE public.questions SET
    question_text = 'Which NASA center explores the solar system with robots?',
    correct_answer = 'JPL',
    incorrect_answers = '["JSC", "KSC", "GSFC"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'ee87be73-7231-4f17-a6b8-e564ea5884b2';

-- Which UN agency in Geneva handles global public health and publishes the Essential Medicines list?
--   hand-rewritten: question 98->53 chars, answers 16->6 chars
UPDATE public.questions SET
    question_text = 'Which Geneva UN agency publishes Essential Medicines?',
    correct_answer = 'WHO',
    incorrect_answers = '["UNICEF", "UNESCO", "UNHCR"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '0ef0929d-0ef6-456b-867a-f2cee9143c7c';

-- Which actor has been nominated for Oscars the most times?
--   trimmed by rule: answers 22->17 chars
UPDATE public.questions SET
    question_text = 'Which actor has been nominated for Oscars the most times?',
    correct_answer = 'Meryl Streep',
    incorrect_answers = '["Katherine Hepburn", "Jack Lemmon", "Denzel Washington"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '975c678f-2a2e-4b30-8d7a-1ec358dd656a';

-- Which ancient Olympic event reflected Spartan military training?
--   trimmed by rule: answers 29->14 chars
UPDATE public.questions SET
    question_text = 'Which ancient Olympic event reflected Spartan military training?',
    correct_answer = 'Hoplitodromos',
    incorrect_answers = '["Chariot racing", "Pankration", "Long jump"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '807092fb-3975-46da-a914-ad38fccbc586';

-- Which animal species was declared extinct in 2019?
--   trimmed by rule: answers 33->19 chars
UPDATE public.questions SET
    question_text = 'Which animal species was declared extinct in 2019?',
    correct_answer = 'Bramble Cay melomys',
    incorrect_answers = '["Baiji dolphin", "Sumatran rhinoceros", "Vaquita porpoise"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '2de338b4-9917-4364-86e6-80017165a0da';

-- Which animal, renowned for having the longest migratory route of any bird, navigates using Earth's magnetic field?
--   hand-rewritten: question 114->45 chars
UPDATE public.questions SET
    question_text = 'Which animal has the longest migratory route?',
    correct_answer = 'Arctic tern',
    incorrect_answers = '["Monarch butterfly", "Humpback whale", "Canada goose"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '149de294-ba09-494f-ac42-764c8b138e7a';

-- Which award show had the 2022 Will Smith/Chris Rock incident?
--   trimmed by rule: answers 27->19 chars
UPDATE public.questions SET
    question_text = 'Which award show had the 2022 Will Smith/Chris Rock incident?',
    correct_answer = 'Academy Awards',
    incorrect_answers = '["Grammy Awards", "Golden Globe Awards", "Emmy Awards"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '5b12feb1-e853-4c01-b4ee-6eb9cdb68251';

-- Which battle featured history's largest cavalry charge?
--   trimmed by rule: answers 25->8 chars
UPDATE public.questions SET
    question_text = 'Which battle featured history''s largest cavalry charge?',
    correct_answer = 'Vienna',
    incorrect_answers = '["Eylau", "Borodino", "Waterloo"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '55669879-3295-475c-93d4-65ca0b5c4afd';

-- Which brand faced criticism for a 2017 trivializing protest ad?
--   trimmed by rule: answers 25->10 chars
UPDATE public.questions SET
    question_text = 'Which brand faced criticism for a 2017 trivializing protest ad?',
    correct_answer = 'Pepsi',
    incorrect_answers = '["Starbucks", "McDonald''s", "Subway"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'c5c38ffd-0d61-4a30-a250-aa11377b52b5';

-- Which celestial body's light-dark cycle is the primary regulator of human circadian rhythms?
--   hand-rewritten: question 92->53 chars
UPDATE public.questions SET
    question_text = 'Which body''s light cycle sets human circadian rhythm?',
    correct_answer = 'The Sun',
    incorrect_answers = '["The Moon", "Mars", "Jupiter"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '0e75c576-356a-42de-83a1-0a2648a72bc2';

-- Which chisel is used by sculptors for texturing marble?
--   trimmed by rule: answers 24->7 chars
UPDATE public.questions SET
    question_text = 'Which chisel is used by sculptors for texturing marble?',
    correct_answer = 'Toothed',
    incorrect_answers = '["Point", "Flat", "Cape"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '7f587431-21f8-4989-a9ab-32124a619b40';

-- Which country of 17,000+ islands is the world’s largest archipelago by area and population?
--   hand-rewritten: question 91->49 chars
UPDATE public.questions SET
    question_text = 'Which country is the world''s largest archipelago?',
    correct_answer = 'Indonesia',
    incorrect_answers = '["Philippines", "Japan", "Malaysia"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '095e85ba-8647-4cba-a727-ebf8b868305b';

-- Which fermentation relies on ambient microbes instead of a starter?
--   trimmed by rule: answers 24->11 chars
UPDATE public.questions SET
    question_text = 'Which fermentation relies on ambient microbes instead of a starter?',
    correct_answer = 'Spontaneous',
    incorrect_answers = '["Controlled", "Anaerobic", "Aerobic"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'b60a607b-0acb-4f55-9815-2bc1e1951643';

-- Which force primarily contains plasma in physics?
--   trimmed by rule: answers 21->15 chars
UPDATE public.questions SET
    question_text = 'Which force primarily contains plasma in physics?',
    correct_answer = 'Electromagnetic',
    incorrect_answers = '["Gravitational", "Strong nuclear", "Weak nuclear"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '0f506dbf-daef-46f7-b22f-8b5afe462dc6';

-- Which game developer has received the most BAFTA Games Awards in total?
--   trimmed by rule: question 71->63 chars
UPDATE public.questions SET
    question_text = 'Which game developer has received the most BAFTA Games Awards ?',
    correct_answer = 'Nintendo',
    incorrect_answers = '["Rockstar Games", "Naughty Dog", "FromSoftware"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '8056877a-0f8e-489a-a0ac-eec183068d1f';

-- Which grain was a primary staple food in ancient Mesopotamia and Egypt, often used for brewing beer?
--   hand-rewritten: question 100->50 chars
UPDATE public.questions SET
    question_text = 'Which grain fed ancient Egypt and brewed its beer?',
    correct_answer = 'Barley',
    incorrect_answers = '["Corn", "Rice", "Oats"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '17c71e5c-1974-497e-b914-40c939ee3519';

-- Which gymnastic apparatus, consisting of two horizontal bars, was developed by Friedrich Ludwig Jahn?
--   hand-rewritten: question 101->60 chars
UPDATE public.questions SET
    question_text = 'Which two-bar gymnastic apparatus did Friedrich Jahn invent?',
    correct_answer = 'Parallel bars',
    incorrect_answers = '["Pommel horse", "Balance beam", "Vault"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '01f1b333-e6a3-4920-b96f-9d8866ed9830';

-- Which highly prized marine mollusk is often considered one of the most expensive seafood delicacies?
--   hand-rewritten: question 100->49 chars
UPDATE public.questions SET
    question_text = 'Which marine mollusk is a prized costly delicacy?',
    correct_answer = 'Abalone',
    incorrect_answers = '["Geoduck", "Sea urchin", "Clam"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '0a8b8ec0-c383-4663-95a6-bdfd353f6d88';

-- Which iconic 1980s sitcom is primarily set in a Boston bar where the regulars often gather?
--   hand-rewritten: question 91->42 chars
UPDATE public.questions SET
    question_text = 'Which 1980s sitcom is set in a Boston bar?',
    correct_answer = 'Cheers',
    incorrect_answers = '["Friends", "Seinfeld", "Taxi"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '093e1099-413f-4efb-bbda-ffcbd77f5b2e';

-- Which linguistic feature primarily distinguishes a tonal language?
--   hand-rewritten: answers 51->20 chars
UPDATE public.questions SET
    question_text = 'Which linguistic feature primarily distinguishes a tonal language?',
    correct_answer = 'Pitch sets meaning',
    incorrect_answers = '["Word order sets it", "Vowel length sets it", "Morphemes set it"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '04e1f243-8ef3-4f9f-a00c-bcf001975332';

-- Which major Emperor penguin breeding colony is located in Queen Maud Land, East Antarctica?
--   hand-rewritten: question 91->53 chars
UPDATE public.questions SET
    question_text = 'Which Emperor penguin colony sits in Queen Maud Land?',
    correct_answer = 'Atka Bay',
    incorrect_answers = '["Cape Crozier", "Punta Tombo", "Snow Hill Island"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '06e878d3-0478-4742-92b9-a8bc4d36a146';

-- Which marine ecosystem with calcium structures is threatened by acidification and bleaching?
--   hand-rewritten: question 92->53 chars
UPDATE public.questions SET
    question_text = 'Which calcium-based marine habitat suffers bleaching?',
    correct_answer = 'Coral reefs',
    incorrect_answers = '["Kelp forests", "Salt marshes", "Mangrove swamps"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '0b8926a3-88e4-4b3d-9616-7d22b8a407a6';

-- Which microprocessor first exceeded 1 billion transistors?
--   trimmed by rule: answers 27->16 chars
UPDATE public.questions SET
    question_text = 'Which microprocessor first exceeded 1 billion transistors?',
    correct_answer = 'Intel Itanium 2',
    incorrect_answers = '["Intel Pentium 4", "AMD Athlon 64", "Intel Core 2 Duo"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '8e223786-24df-4d06-9206-fee1621845d8';

-- Which noise algorithm generates natural textures and terrain in games?
--   trimmed by rule: answers 22->12 chars
UPDATE public.questions SET
    question_text = 'Which noise algorithm generates natural textures and terrain in games?',
    correct_answer = 'Perlin Noise',
    incorrect_answers = '["Bubble Sort", "Dijkstra''s", "A* Search"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '6c338e0a-31f1-4c8e-85d4-cb1efee50f72';

-- Which of Carl Linnaeus's classifications of human groups is now widely considered scientifically discredited?
--   hand-rewritten: question 109->53 chars, answers 51->20 chars
UPDATE public.questions SET
    question_text = 'Which Linnaeus grouping of humans is now discredited?',
    correct_answer = 'Racial varieties',
    incorrect_answers = '["Homo sapiens species", "Order Primates", "Aquatic mammal type"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '03ba6b1d-1629-4099-b69f-c6dde4b995ed';

-- Which of the following accurately represents the primary social hierarchy of medieval European feudal society?
--   hand-rewritten: question 110->53 chars, answers 48->19 chars
UPDATE public.questions SET
    question_text = 'What was the order of medieval European feudal ranks?',
    correct_answer = 'Monarch to serfs',
    incorrect_answers = '["Priests to slaves", "Elders to servants", "Masters to laborers"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '191ff473-5cf1-4e15-ab45-0e69bf33d8d4';

-- Which of the following environmental phenomena has exhibited a notable acceleration in its rate of change since 2005?
--   hand-rewritten: question 117->58 chars, answers 31->20 chars
UPDATE public.questions SET
    question_text = 'Which environmental change has sped up sharply since 2005?',
    correct_answer = 'Arctic sea ice loss',
    incorrect_answers = '["Antarctic ice growth", "Permafrost stability", "Sahel greening"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '08bd11eb-b98f-4970-b4d5-f12d51bb9048';

-- Which of the following is a widely recognized psychological benefit of establishing a consistent daily routine?
--   hand-rewritten: question 111->51 chars, answers 59->15 chars
UPDATE public.questions SET
    question_text = 'What is a proven mental benefit of a daily routine?',
    correct_answer = 'Less anxiety',
    incorrect_answers = '["No real effect", "Causes boredom", "Ends all stress"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '04db3c5d-3dc9-412f-b00f-bc20395a6d57';

-- Which of the following work patterns emerged as a direct result of the Industrial Revolution?
--   hand-rewritten: question 93->55 chars, answers 47->20 chars
UPDATE public.questions SET
    question_text = 'Which work pattern came from the Industrial Revolution?',
    correct_answer = 'Fixed factory shifts',
    incorrect_answers = '["No more manual labor", "Much more leisure", "Less family work"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '14a29cd5-3a60-43db-bc67-6c16dcf5fd89';

-- Which of these South American countries is NOT a natural habitat for capybaras?
--   trimmed by rule: question 79->70 chars
UPDATE public.questions SET
    question_text = 'Which South American countries is NOT a natural habitat for capybaras?',
    correct_answer = 'Chile',
    incorrect_answers = '["Brazil", "Colombia", "Uruguay"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '074dca97-f81b-4548-a9e6-bed0067467f4';

-- Which of these ancient religious texts is considered the oldest still in continuous use today?
--   hand-rewritten: question 94->48 chars
UPDATE public.questions SET
    question_text = 'Which religious text is the oldest still in use?',
    correct_answer = 'The Rigveda',
    incorrect_answers = '["The Bible", "The Quran", "The Tripitaka"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '15b25d7a-636f-4e42-8936-ebc43d31c693';

-- Which of these anime series premiered its 'Swordsmith Village Arc' in 2023?
--   trimmed by rule: question 75->66 chars
UPDATE public.questions SET
    question_text = 'Which anime series premiered its ''Swordsmith Village Arc'' in 2023?',
    correct_answer = 'Demon Slayer',
    incorrect_answers = '["Attack on Titan", "Jujutsu Kaisen", "My Hero Academia"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '6706ef20-3cab-4533-acb7-47427283822f';

-- Which of these distinguished cosmologists was a co-recipient of the Crafoord Prize in Astronomy in 2005?
--   hand-rewritten: question 104->49 chars
UPDATE public.questions SET
    question_text = 'Which cosmologist shared the 2005 Crafoord Prize?',
    correct_answer = 'Jim Peebles',
    incorrect_answers = '["Alan Guth", "Roger Penrose", "Andrei Linde"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '043adbf2-ef7d-4eea-939f-bf26af4cbfb9';

-- Which of these is widely considered the first commercially released home video game console?
--   hand-rewritten: question 92->48 chars, answers 29->18 chars
UPDATE public.questions SET
    question_text = 'What was the first home video game console sold?',
    correct_answer = 'Magnavox Odyssey',
    incorrect_answers = '["Atari Pong", "Nintendo NES", "Sega Master System"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '1598fdb2-ed13-4fd5-b06e-ee63a0259ef6';

-- Which of these observed discrepancies in galactic dynamics led to the hypothesis of dark matter?
--   hand-rewritten: question 96->53 chars, answers 52->20 chars
UPDATE public.questions SET
    question_text = 'Which galaxy observation led to the dark matter idea?',
    correct_answer = 'Odd rotation curves',
    incorrect_answers = '["Microwave background", "Pulsar timing shifts", "Cosmic acceleration"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '161e7640-b0f9-4658-bbbb-e4e7088141ee';

-- Which of these physicists was a co-recipient of the 2004 Wolf Prize in Physics?
--   trimmed by rule: question 79->70 chars
UPDATE public.questions SET
    question_text = 'Which physicists was a co-recipient of the 2004 Wolf Prize in Physics?',
    correct_answer = 'David Gross',
    incorrect_answers = '["Steven Weinberg", "Sheldon Glashow", "Abdus Salam"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'fd975908-c732-480e-9b2b-28600199aefd';

-- Which of these proteins is the most traditional primary ingredient in the Thai dish 'Gai Pad Krapow'?
--   hand-rewritten: question 101->50 chars
UPDATE public.questions SET
    question_text = 'What meat is traditional in Thai ''Gai Pad Krapow''?',
    correct_answer = 'Chicken',
    incorrect_answers = '["Pork", "Beef", "Tofu"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '0a7bbb7f-ed26-4991-8030-c390f15320be';

-- Which of these words is famously cited as having no perfect rhyme in English?
--   trimmed by rule: question 77->68 chars
UPDATE public.questions SET
    question_text = 'Which words is famously cited as having no perfect rhyme in English?',
    correct_answer = 'Orange',
    incorrect_answers = '["Apple", "Table", "River"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'ddee2da8-0d13-47c0-ab9a-019781085759';

-- Which organ transplant saves most healthcare costs?
--   trimmed by rule: answers 22->11 chars
UPDATE public.questions SET
    question_text = 'Which organ transplant saves most healthcare costs?',
    correct_answer = 'Kidney',
    incorrect_answers = '["Bone marrow", "Liver", "Heart"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'e72e094b-27a4-4264-8add-88f53bbcd463';

-- Which organization sets ethics for scholarly publishers?
--   trimmed by rule: answers 34->4 chars
UPDATE public.questions SET
    question_text = 'Which organization sets ethics for scholarly publishers?',
    correct_answer = 'COPE',
    incorrect_answers = '["IRB", "WMA", "ORI"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'dfcdaf1e-0f7f-4319-8af2-061c240e1f8f';

-- Which pitcher threw MLB's fastest recorded pitch?
--   trimmed by rule: answers 27->15 chars
UPDATE public.questions SET
    question_text = 'Which pitcher threw MLB''s fastest recorded pitch?',
    correct_answer = 'Aroldis Chapman',
    incorrect_answers = '["Nolan Ryan", "Roger Clemens", "Bob Feller"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '2af7b71f-9ed3-46fb-bbfc-aae98f066847';

-- Which platform is best for real-time microblogging and news?
--   trimmed by rule: answers 20->8 chars
UPDATE public.questions SET
    question_text = 'Which platform is best for real-time microblogging and news?',
    correct_answer = 'X',
    incorrect_answers = '["Reddit", "Nextdoor", "LinkedIn"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '56453dae-b49d-4313-81d7-f6afd1603126';

-- Which rare human ability is most commercially sought after?
--   trimmed by rule: answers 38->17 chars
UPDATE public.questions SET
    question_text = 'Which rare human ability is most commercially sought after?',
    correct_answer = 'Super-recognition',
    incorrect_answers = '["Perfect pitch", "Synesthesia", "Ambidexterity"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '56883661-f0e2-4c9e-b3fa-2d632afab067';

-- Which region had a famine declared by the UN in 2011?
--   trimmed by rule: answers 25->18 chars
UPDATE public.questions SET
    question_text = 'Which region had a famine declared by the UN in 2011?',
    correct_answer = 'Horn of Africa',
    incorrect_answers = '["Sahel region", "Amazon Basin", "Australian Outback"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'e144191b-18a8-4f06-bb02-e01dfedd7a96';

-- Which researcher on the asteroid impact theory for dinosaur extinction won the Crafoord Prize in 1997?
--   hand-rewritten: question 102->56 chars
UPDATE public.questions SET
    question_text = 'Who won the 1997 Crafoord Prize for the asteroid theory?',
    correct_answer = 'Walter Alvarez',
    incorrect_answers = '["Paul Barrett", "Henrik Svensen", "Stephen Jay Gould"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '0c1827ac-762f-4e2e-9261-6c323d1d906a';

-- Which sense contributes most to our perception of food flavor?
--   trimmed by rule: answers 21->5 chars
UPDATE public.questions SET
    question_text = 'Which sense contributes most to our perception of food flavor?',
    correct_answer = 'Smell',
    incorrect_answers = '["Taste", "Sight", "Touch"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'a067cb67-b21a-4448-8854-78cf33028ce2';

-- Which sitcom actor’s exit caused the biggest viewership drop?
--   trimmed by rule: answers 34->14 chars
UPDATE public.questions SET
    question_text = 'Which sitcom actor’s exit caused the biggest viewership drop?',
    correct_answer = 'Steve Carell',
    incorrect_answers = '["Shelley Long", "Charlie Sheen", "Suzanne Somers"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'a2560010-b1bd-4a85-9c1c-5fa03a00257e';

-- Which social media platform is used for political microblogging?
--   trimmed by rule: answers 20->9 chars
UPDATE public.questions SET
    question_text = 'Which social media platform is used for political microblogging?',
    correct_answer = 'X',
    incorrect_answers = '["LinkedIn", "Pinterest", "Instagram"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'f961ba0b-14d2-485d-bd5c-b0bfb41fc804';

-- Which space telescope launched first chronologically?
--   trimmed by rule: answers 26->16 chars
UPDATE public.questions SET
    question_text = 'Which space telescope launched first chronologically?',
    correct_answer = 'Hubble Space',
    incorrect_answers = '["James Webb Space", "Spitzer Space", "Kepler Space"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '13452f9e-0d54-4f20-a976-7b2c39c2c100';

-- Which statement best characterizes the culinary diversity of Indian curries across its various regions?
--   hand-rewritten: question 103->58 chars, answers 140->16 chars
UPDATE public.questions SET
    question_text = 'How do Indian curries differ across the country''s regions?',
    correct_answer = 'Widely by region',
    incorrect_answers = '["Nearly identical", "Only the protein", "Barely at all"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '03f00e2d-2993-404b-b839-690c49f90bf7';

-- Which technological architecture, introduced in 2017, advanced NLP and machine translation?
--   hand-rewritten: question 91->56 chars, answers 31->20 chars
UPDATE public.questions SET
    question_text = 'Which 2017 architecture transformed machine translation?',
    correct_answer = 'Transformer networks',
    incorrect_answers = '["Digital dictionaries", "Audio recording", "Statistical models"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '07de6df2-df86-43df-bbad-70a900005481';

-- Which theological argument bears William Paley's name?
--   trimmed by rule: answers 21->12 chars
UPDATE public.questions SET
    question_text = 'Which theological argument bears William Paley''s name?',
    correct_answer = 'Teleological',
    incorrect_answers = '["Cosmological", "Ontological", "Moral"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'f10799d3-e54e-4309-91e4-c30c469e59c9';

-- Which university was home to French existentialism?
--   trimmed by rule: answers 24->10 chars
UPDATE public.questions SET
    question_text = 'Which university was home to French existentialism?',
    correct_answer = 'Paris',
    incorrect_answers = '["Berlin", "Vienna", "Copenhagen"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'e31e8b22-868e-4d64-8747-52341dc650a8';

-- Which urban renewal project failed & was demolished in the 1970s?
--   trimmed by rule: answers 33->17 chars
UPDATE public.questions SET
    question_text = 'Which urban renewal project failed & was demolished in the 1970s?',
    correct_answer = 'Pruitt-Igoe',
    incorrect_answers = '["Battery Park City", "Canary Wharf", "Harborplace"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '28276648-7f03-4e30-8286-3d6f03071403';

-- Who is widely recognized as the 'Father of Geometry' for his foundational work, 'Elements'?
--   hand-rewritten: question 91->53 chars
UPDATE public.questions SET
    question_text = 'Who wrote ''Elements'' and is called geometry''s father?',
    correct_answer = 'Euclid',
    incorrect_answers = '["Pythagoras", "Archimedes", "Thales"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '149ebfd0-3cc2-431f-a104-f0c9c648f184';

-- Who tried to build a perpetual motion machine in the 1700s?
--   trimmed by rule: answers 26->18 chars
UPDATE public.questions SET
    question_text = 'Who tried to build a perpetual motion machine in the 1700s?',
    correct_answer = 'Johann Bessler',
    incorrect_answers = '["Isaac Newton", "Gottfried Leibniz", "Christiaan Huygens"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'e383503e-7e57-4d46-b406-c7f081f9fb7f';

-- Who won most Grammys in a single night in 1984?
--   trimmed by rule: answers 27->15 chars
UPDATE public.questions SET
    question_text = 'Who won most Grammys in a single night in 1984?',
    correct_answer = 'Michael Jackson',
    incorrect_answers = '["Stevie Wonder", "Lionel Richie", "Paul Simon"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '872f9bac-b2e5-4345-87b0-e5ecb687c575';

-- Why is graphene key to advanced electronics development?
--   trimmed by rule: answers 23->17 chars
UPDATE public.questions SET
    question_text = 'Why is graphene key to advanced electronics development?',
    correct_answer = 'High cond',
    incorrect_answers = '["High insul", "Strong magn. perm", "Rapid biodegrad"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = true,
    shorten_status = 'shortened',
    answer_shorten_status = 'shortened',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'abc90479-5de1-491c-8fb8-8dba5c55c094';


-- ── 3. repaired but staged in the Library for review (48) ──────
-- An answer over 20 chars that could not be shortened without renaming a
-- proper noun, or a set still unbalanced. Readable, but worth a look.

-- AI field focused on mimicking human conversation?
--   trimmed by rule: answers 33->18 chars
UPDATE public.questions SET
    question_text = 'AI field focused on mimicking human conversation?',
    correct_answer = 'Conversational AI',
    incorrect_answers = '["NLP", "Speech Recognition", "Computer Vision"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '2aacac90-2d59-4d94-a8c5-d3449c9ad1b8';

-- Among the following, which meme originated earliest?
--   trimmed by rule: answers 23->16 chars
UPDATE public.questions SET
    question_text = 'Among the following, which meme originated earliest?',
    correct_answer = 'Rickroll',
    incorrect_answers = '["Loss", "Doge", "Ugandan Knuckles"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'ef6693bd-c4ff-464c-b3f4-279286196ecd';

-- Did NATO expand into former Warsaw Pact countries before or after the Soviet Union dissolved?
--   hand-rewritten: question 93->51 chars
UPDATE public.questions SET
    question_text = 'Did NATO expand east before or after the USSR fell?',
    correct_answer = 'After',
    incorrect_answers = '["Before", "Simultaneously", "NATO never expanded"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '18f6b3cf-0426-488f-b011-3f7313c64acd';

-- Film with Guinness World Record for most costume changes?
--   trimmed by rule: answers 21->17 chars
UPDATE public.questions SET
    question_text = 'Film with Guinness World Record for most costume changes?',
    correct_answer = 'Evita',
    incorrect_answers = '["Devil Wears Prada", "Cleopatra", "Marie Antoinette"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '877bfcfa-960f-4ea6-aa51-76b77464b9ed';

-- Horror film so real, director investigated for murder?
--   trimmed by rule: answers 23->19 chars
UPDATE public.questions SET
    question_text = 'Horror film so real, director investigated for murder?',
    correct_answer = 'Cannibal Holocaust',
    incorrect_answers = '["Blair Witch Project", "REC", "Host"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'f376d970-9b4f-40b3-95de-2bd90b48adcf';

-- How are archaeological layers systematically notated in excavation?
--   trimmed by rule: answers 35->19 chars
UPDATE public.questions SET
    question_text = 'How are archaeological layers systematically notated in excavation?',
    correct_answer = 'Stratigraphic codes',
    incorrect_answers = '["Depth meters only", "Age ranges", "Color descriptions"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '80506fc5-cc55-4035-a633-c1f5252fde1c';

-- In 2017, which London residential tower suffered a deadly fire exposing major safety failures?
--   hand-rewritten: question 94->48 chars
UPDATE public.questions SET
    question_text = 'Which London tower burned in a deadly 2017 fire?',
    correct_answer = 'Grenfell Tower',
    incorrect_answers = '["Champlain Towers South", "Trump Tower NYC", "One57 Manhattan"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '15537fd3-b62a-484f-8375-d9e2c86f2bbb';

-- In which deep-sea trench is the Challenger Deep located?
--   trimmed by rule: answers 22->15 chars
UPDATE public.questions SET
    question_text = 'In which deep-sea trench is the Challenger Deep located?',
    correct_answer = 'Mariana',
    incorrect_answers = '["Tonga", "Kuril-Kamchatka", "Philippine"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '4d949ef1-e680-4391-bd37-f77384e1c24c';

-- In which of these early Olympic events was a medal awarded despite there being only one competitor?
--   hand-rewritten: question 99->50 chars, answers 39->18 chars
UPDATE public.questions SET
    question_text = 'Which early Olympic event medalled a lone entrant?',
    correct_answer = '1904 team race',
    incorrect_answers = '["1896 rope climbing", "1900 tug of war", "1908 polo"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '1305c335-0ea9-4296-87ac-0f00da6bd89c';

-- Traditionally, which river is considered the longest in the world?
--   trimmed by rule: answers 26->20 chars
UPDATE public.questions SET
    question_text = 'Traditionally, which river is considered the longest in the world?',
    correct_answer = 'Nile',
    incorrect_answers = '["Amazon", "Yangtze", "Mississippi-Missouri"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'bcf2667c-080a-4a1f-bc5c-672ebf18969e';

-- What Adobe software do pros use for photo editing & organizing?
--   trimmed by rule: answers 23->17 chars
UPDATE public.questions SET
    question_text = 'What Adobe software do pros use for photo editing & organizing?',
    correct_answer = 'Lightroom Classic',
    incorrect_answers = '["Illustrator", "InDesign", "Premiere Pro"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '84b28666-819c-44e5-9469-07fb8dcaaeee';

-- What did Buddha teach as the path to enlightenment?
--   trimmed by rule: answers 24->20 chars
UPDATE public.questions SET
    question_text = 'What did Buddha teach as the path to enlightenment?',
    correct_answer = 'Noble Eightfold Path',
    incorrect_answers = '["Five Pillars", "Ten Commandments", "Vedic Hymns"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '35f2b15e-51fc-4525-aaa8-bc474286c2c6';

-- What glass is used in deep-sea submersibles and lab equipment?
--   trimmed by rule: answers 22->16 chars
UPDATE public.questions SET
    question_text = 'What glass is used in deep-sea submersibles and lab equipment?',
    correct_answer = 'Borosilicate',
    incorrect_answers = '["Soda-lime", "Laminated safety", "Quartz"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '4cd354c6-7b17-457e-9812-abb7f758c766';

-- What imaging technique maps cloud-shrouded planetary surfaces?
--   trimmed by rule: answers 30->19 chars
UPDATE public.questions SET
    question_text = 'What imaging technique maps cloud-shrouded planetary surfaces?',
    correct_answer = 'SAR',
    incorrect_answers = '["Optical Photography", "Visual Spectroscopy", "Infrared Imaging"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '01d3f603-b395-43b8-bb3b-cd70e02b350d';

-- What paradox does "This sentence is false" exemplify?
--   trimmed by rule: answers 27->15 chars
UPDATE public.questions SET
    question_text = 'What paradox does "This sentence is false" exemplify?',
    correct_answer = 'Liar',
    incorrect_answers = '["Barber", "Grandfather", "Ship of Theseus"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '6686f3a5-d533-45f9-90b3-5009becf072e';

-- What scale, developed in 1935, measures earthquake magnitude?
--   trimmed by rule: answers 22->16 chars
UPDATE public.questions SET
    question_text = 'What scale, developed in 1935, measures earthquake magnitude?',
    correct_answer = 'Richter',
    incorrect_answers = '["Mohs Hardness", "Mercalli", "Moment Magnitude"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'acc9885b-49cd-4a54-9df9-df9f34554124';

-- What surgical complication does sterile protocol prevent?
--   trimmed by rule: answers 29->20 chars
UPDATE public.questions SET
    question_text = 'What surgical complication does sterile protocol prevent?',
    correct_answer = 'SSI',
    incorrect_answers = '["Hemorrhage", "Anesthesia reaction", "Deep vein thrombosis"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '55153438-5da0-478a-af05-92ad24ce6a36';

-- What talent agency represents Taylor Swift as of 2024?
--   trimmed by rule: answers 29->12 chars
UPDATE public.questions SET
    question_text = 'What talent agency represents Taylor Swift as of 2024?',
    correct_answer = 'CAA',
    incorrect_answers = '["WME", "UTA", "ICM Partners"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'f4f2cef3-1586-40fd-8f8e-a3adb3f47025';

-- What's the scientific classification of X-Men's human subspecies?
--   trimmed by rule: answers 21->16 chars
UPDATE public.questions SET
    question_text = 'What''s the scientific classification of X-Men''s human subspecies?',
    correct_answer = 'Superior',
    incorrect_answers = '["Sapiens", "Neanderthalensis", "Erectus"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '398438a9-915b-4e50-8ef7-0b4f938eaac9';

-- Which 1953 posthumous work by Wittgenstein, exploring “language-games,” is a key philosophy of language text?
--   hand-rewritten: question 109->52 chars, answers 30->30 chars
UPDATE public.questions SET
    question_text = 'Which Wittgenstein book introduced ''language-games''?',
    correct_answer = 'Philosophical Investigations',
    incorrect_answers = '["Tractatus Logico-Philosophicus", "On Certainty", "The Blue and Brown Books"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '13a31e76-1c2f-4bcc-9386-00947fd64d7e';

-- Which Scorsese film chronicles Jordan Belfort's rise and fall?
--   trimmed by rule: answers 23->19 chars
UPDATE public.questions SET
    question_text = 'Which Scorsese film chronicles Jordan Belfort''s rise and fall?',
    correct_answer = 'Wolf of Wall Street',
    incorrect_answers = '["Big Short", "Too Big to Fail", "Inside Job"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '7ad0eca0-8bf7-457a-bdd7-ce00d60ecbc4';

-- Which U.S. agency tracks mineral supply, demand, and reserves?
--   trimmed by rule: answers 37->20 chars
UPDATE public.questions SET
    question_text = 'Which U.S. agency tracks mineral supply, demand, and reserves?',
    correct_answer = 'USGS',
    incorrect_answers = '["BLM", "EPA", "Department of Energy"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'f76707a6-0410-4c82-bbcf-0fafd5dcfe32';

-- Which algorithm sparks debate on fairness and bias in justice?
--   trimmed by rule: answers 28->18 chars
UPDATE public.questions SET
    question_text = 'Which algorithm sparks debate on fairness and bias in justice?',
    correct_answer = 'COMPAS',
    incorrect_answers = '["PageRank", "Bubble Sort", "Euclidean distance"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'a48fca10-33a5-4b3d-89ee-036f71784cc0';

-- Which analytical method is primarily used to quantify the likelihood of sports outcomes based on historical data?
--   hand-rewritten: question 113->53 chars
UPDATE public.questions SET
    question_text = 'Which method predicts sports outcomes from past data?',
    correct_answer = 'Probability modeling',
    incorrect_answers = '["Qualitative scouting", "Subjective forecasting", "Arbitrary indexing"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '08bb2295-4404-43f8-acb7-c7ac187c8f65';

-- Which anime film, released in 1995, is widely credited with inspiring the Wachowskis' film 'The Matrix'?
--   hand-rewritten: question 104->44 chars, answers 20->18 chars
UPDATE public.questions SET
    question_text = 'Which 1995 anime film inspired ''The Matrix''?',
    correct_answer = 'Ghost in the Shell',
    incorrect_answers = '["Akira", "Spirited Away", "Perfect Blue"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '06d9d6ac-930e-4719-bc26-e879bcf9be58';

-- Which artist had highest auction turnover in 2022?
--   trimmed by rule: answers 27->20 chars
UPDATE public.questions SET
    question_text = 'Which artist had highest auction turnover in 2022?',
    correct_answer = 'Andy Warhol',
    incorrect_answers = '["Jean-Michel Basquiat", "David Hockney", "Yue Minjun"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'f9b7992e-50a6-4e96-baf8-f85ec8f88d7a';

-- Which awards did the US Office win the most from?
--   trimmed by rule: answers 26->19 chars
UPDATE public.questions SET
    question_text = 'Which awards did the US Office win the most from?',
    correct_answer = 'Emmy',
    incorrect_answers = '["Golden Globe", "Screen Actors Guild", "People''s Choice"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'c2629adc-1ae7-4746-82c5-cdf27d6fbe61';

-- Which band released an album in 2012 about thermodynamics?
--   trimmed by rule: answers 21->17 chars
UPDATE public.questions SET
    question_text = 'Which band released an album in 2012 about thermodynamics?',
    correct_answer = 'Muse',
    incorrect_answers = '["Radiohead", "Coldplay", "Chemical Brothers"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '6a6e7e3b-7cf9-4cfa-a9d5-849818562c9d';

-- Which celebrity-hosted podcast earned the most ad revenue in 2022?
--   trimmed by rule: answers 24->20 chars
UPDATE public.questions SET
    question_text = 'Which celebrity-hosted podcast earned the most ad revenue in 2022?',
    correct_answer = 'Joe Rogan Experience',
    incorrect_answers = '["Call Her Daddy", "SmartLess", "Ben Shapiro Show"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '090eff6f-b1ab-4574-958b-44f93eda1ad0';

-- Which cooking oil has the highest smoke point for high-temp frying?
--   trimmed by rule: answers 22->18 chars
UPDATE public.questions SET
    question_text = 'Which cooking oil has the highest smoke point for high-temp frying?',
    correct_answer = 'Avocado',
    incorrect_answers = '["Extra virgin olive", "Unrefined coconut", "Flaxseed"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'b7693ea7-4a74-4247-a0fe-2f2129790e39';

-- Which cryptocurrency exchange collapsed in Nov 2022 due to fraud?
--   trimmed by rule: answers 27->20 chars
UPDATE public.questions SET
    question_text = 'Which cryptocurrency exchange collapsed in Nov 2022 due to fraud?',
    correct_answer = 'FTX',
    incorrect_answers = '["Terraform Labs", "Celsius Network", "Three Arrows Capital"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '273a10f3-913d-48c5-b4ac-e3ec5fcd604c';

-- Which famous bridge nearly collapsed during construction in 1940?
--   trimmed by rule: answers 21->14 chars
UPDATE public.questions SET
    question_text = 'Which famous bridge nearly collapsed during construction in 1940?',
    correct_answer = 'Tacoma Narrows',
    incorrect_answers = '["Golden Gate", "Brooklyn", "Tower"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '47f746c3-a8e2-432f-9a42-9412f7396570';

-- Which genetic mutation confers HIV resistance naturally?
--   trimmed by rule: answers 29->20 chars
UPDATE public.questions SET
    question_text = 'Which genetic mutation confers HIV resistance naturally?',
    correct_answer = 'CCR5-delta32',
    incorrect_answers = '["Factor V Leiden", "Huntington''s disease", "BRCA1"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '2f5bc247-14d8-4d07-9ef0-ae7519dc3410';

-- Which lab technique determines soil mineral composition?
--   trimmed by rule: answers 23->17 chars
UPDATE public.questions SET
    question_text = 'Which lab technique determines soil mineral composition?',
    correct_answer = 'X-ray Diffraction',
    incorrect_answers = '["Thermometer", "pH meter", "Density scale"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '427aabfe-30dd-485c-8fca-e5569739749d';

-- Which law quantifies brightness difference by apparent magnitude?
--   trimmed by rule: answers 23->19 chars
UPDATE public.questions SET
    question_text = 'Which law quantifies brightness difference by apparent magnitude?',
    correct_answer = 'Pogson''s',
    incorrect_answers = '["Hubble''s", "Wien''s Displacement", "Kepler''s Third"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '8ec3f269-303a-46c4-885e-c670e7df0b99';

-- Which meme aesthetic uses heavy saturation, contrast, and JPEG artifacts for a “fried” look?
--   hand-rewritten: question 92->58 chars
UPDATE public.questions SET
    question_text = 'Which meme style uses heavy saturation and JPEG artifacts?',
    correct_answer = 'Deep-fried memes',
    incorrect_answers = '["Loss format", "Wojak variations", "Expanding brain memes"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '08054492-64f9-4a95-b25c-57637002703b';

-- Which meme showed a basketball player acting confused?
--   trimmed by rule: answers 29->20 chars
UPDATE public.questions SET
    question_text = 'Which meme showed a basketball player acting confused?',
    correct_answer = 'Confused Nick Young',
    incorrect_answers = '["Blinking White Guy", "Math Lady", "Distracted Boyfriend"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'b9f5aa78-53af-44bb-826b-59844b84afcf';

-- Which microphone is for hands-free, discreet audio capture?
--   trimmed by rule: answers 28->17 chars
UPDATE public.questions SET
    question_text = 'Which microphone is for hands-free, discreet audio capture?',
    correct_answer = 'Wireless lavalier',
    incorrect_answers = '["Shotgun", "USB condenser", "Dynamic handheld"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '08ce98a5-2a22-4456-a445-980000fb1727';

-- Which microscopy offers sub-nanometer, atomic-level imaging?
--   trimmed by rule: answers 28->17 chars
UPDATE public.questions SET
    question_text = 'Which microscopy offers sub-nanometer, atomic-level imaging?',
    correct_answer = 'Atomic Force',
    incorrect_answers = '["Scanning Electron", "Confocal", "Brightfield"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'a9138a70-7185-4f3a-b299-8d132fa38742';

-- Which of the following internet memes originated from an anime or manga?
--   trimmed by rule: question 72->55 chars
UPDATE public.questions SET
    question_text = 'Which internet memes originated from an anime or manga?',
    correct_answer = 'Is this a pigeon?',
    incorrect_answers = '["Rage comics", "Wojak", "Loss meme"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '88f2bff1-f117-4d7f-a070-f4d5993b070e';

-- Which of the following is a content rating assigned to video games by the ESRB?
--   trimmed by rule: question 79->62 chars
UPDATE public.questions SET
    question_text = 'Which is a content rating assigned to video games by the ESRB?',
    correct_answer = 'Mature',
    incorrect_answers = '["Teen Plus", "Kids & Family", "General Audience"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '060ba9b6-f75f-4f34-8e9a-84c33b53a9bd';

-- Which of these manga series was first serialized in Weekly Shonen Jump?
--   trimmed by rule: question 71->62 chars
UPDATE public.questions SET
    question_text = 'Which manga series was first serialized in Weekly Shonen Jump?',
    correct_answer = 'Bleach',
    incorrect_answers = '["Astro Boy", "20th Century Boys", "Fullmetal Alchemist"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '4ad4c17e-6271-4ba3-bd5a-2441377b32bd';

-- Which of these represents a fundamental, unresolved issue within the various interpretations of quantum mechanics?
--   hand-rewritten: question 114->55 chars
UPDATE public.questions SET
    question_text = 'Which deep problem in quantum mechanics stays unsolved?',
    correct_answer = 'The Measurement Problem',
    incorrect_answers = '["The Uncertainty Principle", "Quantum Entanglement", "Wave-Particle Duality"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '17af4323-ed07-49ea-bac2-ddc9ab1e3e95';

-- Which organization sets global wildlife protection standards?
--   trimmed by rule: answers 22->18 chars
UPDATE public.questions SET
    question_text = 'Which organization sets global wildlife protection standards?',
    correct_answer = 'IUCN',
    incorrect_answers = '["WWF", "UNEP", "Nature Conservancy"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = 'cef2c18d-ce95-4809-bf3c-3f5c6f791dc7';

-- Which solar event is blamed for major tech disruption risks?
--   trimmed by rule: answers 27->13 chars
UPDATE public.questions SET
    question_text = 'Which solar event is blamed for major tech disruption risks?',
    correct_answer = 'CME',
    incorrect_answers = '["Solar Flare", "Sunspot Cycle", "Solar Wind"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '8656a625-d6b3-4992-963c-a72957fb0081';

-- Which synthetic compounds depleted Earth's ozone layer?
--   trimmed by rule: answers 26->19 chars
UPDATE public.questions SET
    question_text = 'Which synthetic compounds depleted Earth''s ozone layer?',
    correct_answer = 'Chlorofluorocarbons',
    incorrect_answers = '["Carbon dioxide", "Methane", "Sulfur dioxide"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '37b5d3ef-59c9-43cb-9bdd-26826c1a42f3';

-- Which viral disease devastated East African cassava in the 1990s?
--   trimmed by rule: answers 26->18 chars
UPDATE public.questions SET
    question_text = 'Which viral disease devastated East African cassava in the 1990s?',
    correct_answer = 'Mosaic disease',
    incorrect_answers = '["Brown streak virus", "Bacterial blight", "Root rot"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '7891501a-1f17-40b9-a00d-a204e8f7ace7';

-- Who converted from persecuting Christians to leading apostle?
--   trimmed by rule: answers 37->16 chars
UPDATE public.questions SET
    question_text = 'Who converted from persecuting Christians to leading apostle?',
    correct_answer = 'Saul of Tarsus',
    incorrect_answers = '["Peter", "Judas Iscariot", "John the Baptist"]'::jsonb,
    original_question_text = COALESCE(original_question_text, question_text),
    original_correct_answer = COALESCE(original_correct_answer, correct_answer),
    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    in_production = false,
    shorten_status = 'pending_review',
    answer_shorten_status = 'pending_review',
    quality_status = NULL,
    quality_issues = NULL,
    last_quality_check = now(),
    updated_at = now()
  WHERE id = '334a9d8c-c648-4ea2-9687-5a54b5119872';

COMMIT;

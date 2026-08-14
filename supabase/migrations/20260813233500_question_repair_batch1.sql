-- English question bank repair.
--
-- Three things happen here:
--
--   1. Duplicates and unfixable questions are retired: is_active = false and
--      in_production = false. Nothing is deleted, so any of it can be brought
--      back with a single UPDATE. Where a duplicate was retired, the surviving
--      twin is named in the comment above it.
--
--   2. Repaired questions that passed every check go straight back to
--      production. These rows were already being served: a hand rewrite was
--      fact-checked when it was written, and a rule trim only removes words the
--      question itself already supplied. Neither can be less correct than what
--      is live right now, so parking them in the Library would take working
--      questions out of the game for no reason.
--
--   3. Repaired questions that tripped a warning — an answer over 20 chars that
--      could not be shortened without renaming a proper noun, or a set still
--      unbalanced — go to the Library instead, for a look before promotion.
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

-- duplicate_conflicting: twins whose correct answers disagreed; the factually correct copy survives (34)
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
-- In what year was Tutankhamun's tomb discovered?
--   near-identical to 3d11d5f1
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate_conflicting', updated_at = now() WHERE id = 'd4b82797-8ad0-4ba3-a249-20fc0babea56';
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
-- Which film won most Academy Awards in a single year?
--   near-identical to 28a59fa2
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate_conflicting', updated_at = now() WHERE id = '3b2a335d-c976-4f78-8c82-376cbb4a8e92';
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
-- Why can't you hear sound in outer space?
--   near-identical to e21ec168
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate_conflicting', updated_at = now() WHERE id = '9ebe60e5-b4a0-4cb8-8fd6-5055fbce7b6d';

-- duplicate: exact or near-identical twins; the better-formed copy survives (125)
-- Authored "On the Origin of Species" - who was it?
--   near-identical to 2dea77cb
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'd7d117ff-8e92-461b-9ba1-0dad56cbad52';
-- Don Draper is main character of what series?
--   near-identical to 4fd5798f
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'd480ae54-c51e-4696-bd29-55313268067b';
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
-- How many players are in a Rugby Union team's starting lineup?
--   near-identical to 9b9ac07c
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '62258157-952e-4dec-a377-c7d0509f66fd';
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
-- How many teeth does an adult human have (incl. wisdom)?
--   near-identical to 146971a8
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '0a5ade4b-9347-4f46-8d35-bb30275addd3';
-- How many teeth does an adult human have?
--   near-identical to 146971a8
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'e51d2257-f6d8-4109-8eea-702470735b11';
-- In a standard game of Rugby Union, how many players are on the field for one team at the start of the match?
--   near-identical to 9b9ac07c
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '16106329-397a-4723-8cd7-ee434dad52b3';
-- In what year did Tim Berners-Lee release the World Wide Web software to the public?
--   near-identical to e126386a
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'b90c0735-5075-443c-b785-e562069ba0d6';
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
-- Is the Great Wall of China visible from space?
--   near-identical to 390eee0b
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'c6790d48-59fc-4982-bff5-f006cdfce637';
-- Name the oldest known intact rock formation on Earth?
--   near-identical to 5f530866
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'ca4b4083-61b9-4424-979c-b537be0ae2ae';
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
-- What evolutionary principle is named after Charles Darwin?
--   near-identical to 1818cbd7
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '0a60a6fd-9ae5-442c-ab33-be8c456b0584';
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
--   near-identical to f5d06008
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '263fe0bb-5d33-43e0-a687-cfc3abc0c94a';
-- What is chemical formula for water?
--   near-identical to f5d06008
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '791d7558-3154-49b6-afc6-19a0385dfa59';
-- What is chemical formula for water?
--   near-identical to f5d06008
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'b90ffd12-5391-48ad-b416-5b0d638ad879';
-- What is chemical formula for water?
--   near-identical to f5d06008
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'eba73542-4852-4ddb-b385-dc5a6c6a447a';
-- What is earliest social network?
--   near-identical to fa9e852f
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'e5577931-6936-43be-93ee-10c11857ddf8';
-- What is sulfuric acid's formula?
--   near-identical to ecc18b16
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'cbd7d0f7-4e24-4f91-a0db-76bc0d176995';
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
-- What is the most abundant element in the observable universe?
--   near-identical to 0b073a8f
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '8b8cab89-dffa-4158-acc4-c19f6b118e7e';
-- What is the normal human body temperature in Celsius?
--   near-identical to c95a2323
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '93e75fc2-f6b4-442f-9ef3-bf30ab01082d';
-- What is the smallest country in the world?
--   near-identical to 9f07ba20
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '62d135c7-f2b2-4d10-9ccd-3a790d45d0d0';
-- What is the square root of 144 in basic mathematics?
--   near-identical to e3098a12
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '33bc8bf8-ae0a-494d-b499-feee2ba69dde';
-- What is the value of pi rounded to two decimal places?
--   near-identical to a8ab09a8
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '956154e5-5a00-40c9-a1f8-fb8583416382';
-- What is the value of pi to two decimal places?
--   near-identical to a8ab09a8
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '75ffc20f-7237-4df6-a1bf-d8f1ae0af04c';
-- What optical tool did Galileo use to observe Jupiter's moons?
--   near-identical to 746d2e83
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '08163744-7e1b-4009-8755-d946bd4eccb8';
-- What percentage of Earth's surface is water?
--   near-identical to 936ffc9f
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '772f8c4c-3036-465e-8427-36c2eaa305df';
-- What percentage of an average adult male's body weight is water?
--   near-identical to b4cfc8dc
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'b35fba9a-4b23-43e6-80f0-81fdd5f4612f';
-- What percentage of human body weight is water?
--   near-identical to 4813bef8
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '643c2370-0d8a-497b-9528-4793d271365b';
-- What percentage of the human body is water?
--   near-identical to 4813bef8
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '167577fa-2387-4dfa-8e11-eeadf2db96f3';
-- What planet has the most moons?
--   near-identical to 6b59c9a5
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '7d20542b-f578-4694-ae58-f898379cb2b4';
-- What programming language did Microsoft create?
--   near-identical to fafb389e
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '6b2827c5-e1cf-4570-a3aa-cfe7bbb5bf94';
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
-- Which Scandinavian country developed Minecraft's creator?
--   near-identical to 21d53c8b
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '56f369b3-5c01-4620-8a00-9053ceeb6061';
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
-- Which physicist discovered the laws of planetary motion?
--   near-identical to 5bd3b64c
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '7ec6b152-8243-4c55-a585-0ab307e6cc16';
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
-- Which platform's 'Stories' feature launched in 2016?
--   near-identical to 0589cc36
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '943f8145-0345-4010-9963-3c096fbfb5e3';
-- Which scientist developed the theory of relativity?
--   near-identical to aa0b74c1
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'b762c283-b6f4-4980-9b08-596af3e0c6c7';
-- Who declared 'I came, I saw, I conquered'?
--   near-identical to 4c1ee6a6
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'ac6142b9-29c1-4a9b-a4fd-e81923d689d2';
-- Who developed the first effective vaccine in 1796?
--   near-identical to 2addae11
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'a1cd8ecd-256a-471c-acf3-02418d6ab6bf';
-- Who developed the periodic table of elements?
--   near-identical to 2c559e7c
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '11d99a47-322c-4189-87e5-c0ba6682733f';
-- Who discovered penicillin antibiotic in 1928?
--   near-identical to c7bf40a1
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '65b268ac-4c2f-4cdb-86e7-b71121b09a31';
-- Who discovered the structure of DNA in 1953?
--   near-identical to aca2797a
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '0e6e9883-0a9f-4497-882c-680504f19575';
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
-- Who is Pac-Man's most famous ghost?
--   near-identical to 3c9752f7
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'b3f76a92-12e9-43b8-8202-e127d627bc96';
-- Who pioneered molecular gastronomy post-2000?
--   near-identical to f3b12da9
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '63e791a0-3691-4229-87c5-8b6d35350a7a';
-- Who proposed the theory of continental drift?
--   near-identical to 7ecce6da
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'e205275c-c8fa-4513-a13e-258a00cdd4f7';
-- Who said 'I came, I saw, I conquered' in political context?
--   near-identical to 4c1ee6a6
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = '3219aac3-d060-4950-9c19-601cab045341';
-- Who was granted the first U.S. patent for the telephone in 1876?
--   near-identical to e4fc3ad4
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'b6af55e0-ae4c-40cc-9363-85112f56377f';
-- Who was the first European to reach India by sea?
--   near-identical to aa8801ef
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_duplicate', updated_at = now() WHERE id = 'f3e2c338-ba66-4c80-9299-1a6157dbac4c';

-- unfixable: no correct question underneath — invented premise, unverifiable, or several true options (10)
-- According to the 2023 Kearney Global Services Location Index (GSLI), how many countries were evaluated?
--   unanswerable trivia: a single index's country count for one year
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_unfixable', updated_at = now() WHERE id = 'a5cc5ad0-8ece-4fb1-b9c3-ca20f2253e36';
-- As of 2023, which dress holds the record for the most expensive ever sold at a public auction?
--   same question as a7092f1a (most expensive dress at auction), with an "as of 2023" stamp
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_unfixable', updated_at = now() WHERE id = 'c15f9c15-efce-4067-b695-1ee9e397270d';
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


-- ── 2. repaired and cleared for production (203) ─────────────
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

-- According to medical studies, does cracking your knuckles cause arthritis?
--   hand-rewritten: question 74->44 chars, answers 53->20 chars
UPDATE public.questions SET
    question_text = 'Does cracking your knuckles cause arthritis?',
    correct_answer = 'No proven link',
    incorrect_answers = '["Yes, it causes it", "Yes, thins the fluid", "Yes, wears cartilage"]'::jsonb,
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
  WHERE id = '3c78f980-b91a-44c6-a7dc-052fa19b1b6f';

-- According to research in embodied cognition, how does ambient temperature typically influence interpersonal behavior?
--   hand-rewritten: question 117->56 chars, answers 80->19 chars
UPDATE public.questions SET
    question_text = 'How does a warm room change how people treat each other?',
    correct_answer = 'More generous',
    incorrect_answers = '["No social effect", "Colder unites more", "Only comfort shifts"]'::jsonb,
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
  WHERE id = '1a968177-ed35-4606-b2b0-b065fc492a18';

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

-- Anime genre for high schoolers, daily life?
--   hand-rewritten: question 43->51 chars, answers 13->13 chars
UPDATE public.questions SET
    question_text = 'Which anime genre covers everyday high school life?',
    correct_answer = 'Slice of Life',
    incorrect_answers = '["Mecha", "Isekai", "Harem"]'::jsonb,
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
  WHERE id = '745d2792-3811-43a0-95bc-b4767ecbb852';

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

-- As of 2024, what is the scientific consensus regarding artificial intelligence achieving genuine consciousness?
--   hand-rewritten: question 111->47 chars, answers 86->18 chars
UPDATE public.questions SET
    question_text = 'Is there evidence that AI has become conscious?',
    correct_answer = 'No, none at all',
    incorrect_answers = '["Yes, in top models", "Partly, it creates", "Yes, since 2022"]'::jsonb,
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
  WHERE id = 'ba4b020e-b8da-4033-b5a7-f341c42fdbbb';

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

-- At the 2021 BAFTA Games Awards, what major accolade did Hades achieve?
--   hand-rewritten: question 70->50 chars, answers 57->17 chars
UPDATE public.questions SET
    question_text = 'What did Hades win at the 2021 BAFTA Games Awards?',
    correct_answer = 'Best Game',
    incorrect_answers = '["Best Indie Game", "Best Debut Game", "Only a nomination"]'::jsonb,
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
  WHERE id = 'e22068ad-e485-4bb4-a88c-85ec3269295a';

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

-- Has definitive archaeological evidence of leprosy been identified in victims of the 79 AD Vesuvius eruption?
--   hand-rewritten: question 108->60 chars, answers 75->20 chars
UPDATE public.questions SET
    question_text = 'Was leprosy found in victims of the 79 AD Vesuvius eruption?',
    correct_answer = 'No, not definitively',
    incorrect_answers = '["Yes, in skeletons", "Yes, then dismissed", "Yes, very widely"]'::jsonb,
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
  WHERE id = '678a0ae3-aa05-4801-9b3a-3deff71ecfc0';

-- How can medical trauma impact an individual's psychological and social functioning?
--   hand-rewritten: question 83->47 chars, answers 80->20 chars
UPDATE public.questions SET
    question_text = 'How can medical trauma affect someone socially?',
    correct_answer = 'Social withdrawal',
    incorrect_answers = '["Stronger friendships", "No effect at all", "Recovery is instant"]'::jsonb,
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
  WHERE id = '7eb01b49-9840-4a9d-8933-3292dc113e17';

-- How did carbon fiber rackets revolutionize tennis equipment?
--   hand-rewritten: question 60->43 chars, answers 73->19 chars
UPDATE public.questions SET
    question_text = 'How did carbon fibre change tennis rackets?',
    correct_answer = 'Lighter and stiffer',
    incorrect_answers = '["Only better spin", "Immune to vibration", "No tension needed"]'::jsonb,
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
  WHERE id = 'da07b536-f6d9-4cca-a455-aafede6a770a';

-- How did colonial powers typically fragment existing ethnic groups when establishing borders?
--   hand-rewritten: question 92->45 chars, answers 65->18 chars
UPDATE public.questions SET
    question_text = 'How did colonial borders split ethnic groups?',
    correct_answer = 'Arbitrary lines',
    incorrect_answers = '["Forced migration", "Unified identities", "New cultural norms"]'::jsonb,
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
  WHERE id = '2ce8852a-e9bb-48ec-8020-a354123c3cb7';

-- How do Field-Effect Transistors (FETs) primarily switch electronic signals?
--   hand-rewritten: question 75->51 chars, answers 70->18 chars
UPDATE public.questions SET
    question_text = 'How does a field-effect transistor switch a signal?',
    correct_answer = 'Voltage on a gate',
    incorrect_answers = '["A moving lever", "Magnetic alignment", "Light wavelengths"]'::jsonb,
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
  WHERE id = 'c004fe5b-4892-41af-a847-2ef0d66a6336';

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

-- How does higher alveolar oxygen pressure affect gas exchange?
--   hand-rewritten: answers 15->16 chars
UPDATE public.questions SET
    question_text = 'How does higher alveolar oxygen pressure affect gas exchange?',
    correct_answer = 'More O₂ to blood',
    incorrect_answers = '["Less O₂ to blood", "No effect on O₂", "Only affects N₂"]'::jsonb,
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
  WHERE id = '1e3df881-a8b5-414d-8e26-3f7eeca9389b';

-- How does lemon juice remove organic stains from fabric?
--   hand-rewritten: question 55->41 chars, answers 22->20 chars
UPDATE public.questions SET
    question_text = 'How does lemon juice lift organic stains?',
    correct_answer = 'Citric acid, low pH',
    incorrect_answers = '["High pH kills germs", "Adds oxygen to fibre", "Bleaches the fabric"]'::jsonb,
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
  WHERE id = '20c6fc37-1116-4ab4-8676-11da55ef1b15';

-- How does microgravity affect the directional growth of plant roots?
--   hand-rewritten: question 67->44 chars, answers 54->18 chars
UPDATE public.questions SET
    question_text = 'How does microgravity change how roots grow?',
    correct_answer = 'They grow randomly',
    incorrect_answers = '["Plants cannot grow", "Roots grow faster", "Roots lose colour"]'::jsonb,
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
  WHERE id = '99796769-2d3d-4a22-bc01-4fba8c9b8d10';

-- How does ocean acidification impact the formation of shells in marine organisms, particularly shellfish?
--   hand-rewritten: question 104->53 chars, answers 119->20 chars
UPDATE public.questions SET
    question_text = 'How does ocean acidification affect shellfish shells?',
    correct_answer = 'Fewer carbonate ions',
    incorrect_answers = '["Shells grow stronger", "Ocean pH is moot", "Shells ignore water"]'::jsonb,
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
  WHERE id = '58d307d5-3f57-40c6-81f0-e35529300952';

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

-- How many languages are officially used during the opening and closing ceremonies of the Olympic Games?
--   hand-rewritten: question 102->50 chars, answers 61->5 chars
UPDATE public.questions SET
    question_text = 'How many languages are used at Olympic ceremonies?',
    correct_answer = 'Three',
    incorrect_answers = '["Two", "Five", "Six"]'::jsonb,
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
  WHERE id = '44ecfd91-3c8e-46a8-a801-2c1d1d868891';

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

-- In 2018, how did Instagram's algorithm change significantly impact user engagement?
--   hand-rewritten: question 83->48 chars, answers 51->20 chars
UPDATE public.questions SET
    question_text = 'How did Instagram''s 2018 algorithm change feeds?',
    correct_answer = 'Pushed video first',
    incorrect_answers = '["Hid all like counts", "Capped friend counts", "Banned hashtags"]'::jsonb,
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
  WHERE id = '3d0042c4-6d2b-4777-a03e-a30fe0d18800';

-- In GPS-denied indoor environments, which of the following is a primary cause of autonomous robot navigation failure?
--   hand-rewritten: question 116->48 chars, answers 53->19 chars
UPDATE public.questions SET
    question_text = 'Why do indoor robots lose their way without GPS?',
    correct_answer = 'Odometry drift',
    incorrect_answers = '["No internet uplink", "Air pressure change", "AI refuses commands"]'::jsonb,
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
  WHERE id = '21cc0e27-19e0-4465-8611-28e60fc9454b';

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

-- In Python, which notation indicates a function's return type?
--   hand-rewritten: question 61->57 chars, answers 2->14 chars
UPDATE public.questions SET
    question_text = 'In Python, which notation marks a function''s return type?',
    correct_answer = 'An arrow',
    incorrect_answers = '["A colon", "An equals sign", "A semicolon"]'::jsonb,
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
  WHERE id = '3e2e0aef-1ae9-41bd-9c24-937271b85d36';

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

-- In many political biopics, which common narrative misrepresentation often overemphasizes the role of a single figure?
--   hand-rewritten: question 117->53 chars, answers 89->20 chars
UPDATE public.questions SET
    question_text = 'Which distortion do political biopics most often use?',
    correct_answer = 'The ''Great Man'' view',
    incorrect_answers = '["Accurate geopolitics", "Understated struggle", "Collective movements"]'::jsonb,
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
  WHERE id = '3907054b-80a7-4385-9263-8f73c85eea62';

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

-- In the European Union, which body is primarily responsible for regulating pharmaceutical manufacturing standards?
--   hand-rewritten: question 113->53 chars, answers 58->4 chars
UPDATE public.questions SET
    question_text = 'Which body regulates EU pharmaceutical manufacturing?',
    correct_answer = 'EMA',
    incorrect_answers = '["FDA", "PMDA", "MHRA"]'::jsonb,
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
  WHERE id = '7448dc64-6550-40bc-80da-ebf0b95dcd54';

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

-- In the context of the Roman Republic, what was the primary meaning of the Latin word 'imperium'?
--   hand-rewritten: question 96->47 chars, answers 49->17 chars
UPDATE public.questions SET
    question_text = 'What did ''imperium'' mean in the Roman Republic?',
    correct_answer = 'Power to command',
    incorrect_answers = '["Roman territory", "A war declaration", "A priestly rite"]'::jsonb,
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
  WHERE id = '765e1576-507d-4dcf-881d-d949f9e231d9';

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

-- In the official 'Who's Who in America' biographical directory, how are an individual's awards consistently presented?
--   hand-rewritten: question 117->44 chars, answers 51->20 chars
UPDATE public.questions SET
    question_text = 'How does ''Who''s Who in America'' list awards?',
    correct_answer = 'Name, then the year',
    incorrect_answers = '["A star rating", "Gold, silver, bronze", "Abbreviations only"]'::jsonb,
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
  WHERE id = '3fda97cb-d13a-458d-b481-4ba868145d75';

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

-- Is it true that lightning frequently strikes the same place multiple times?
--   hand-rewritten: question 75->51 chars, answers 96->17 chars
UPDATE public.questions SET
    question_text = 'Can lightning strike the same place more than once?',
    correct_answer = 'Yes, often',
    incorrect_answers = '["No, never twice", "Only in one storm", "Only in rare air"]'::jsonb,
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
  WHERE id = '29ef7916-0151-4787-bfec-a2ed7fdb44fc';

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

-- Is the human skeleton completely replaced every seven years?
--   hand-rewritten: question 60->49 chars, answers 60->20 chars
UPDATE public.questions SET
    question_text = 'Is the human skeleton replaced every seven years?',
    correct_answer = 'No, nearer ten years',
    incorrect_answers = '["Yes, every seven", "Only in children", "No, nearer twenty"]'::jsonb,
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
  WHERE id = 'a0657f44-1645-49b1-a131-5828f0d5f8f8';

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

-- What abbreviation denotes 'megabyte' in digital storage?
--   hand-rewritten: question 56->38 chars, answers 2->2 chars
UPDATE public.questions SET
    question_text = 'Which abbreviation means one megabyte?',
    correct_answer = 'MB',
    incorrect_answers = '["KB", "GB", "TB"]'::jsonb,
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
  WHERE id = '7dae3534-8e31-4a0c-a02f-2d1f765fd13c';

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

-- What determines the direction (Qibla) Muslims face during prayer?
--   hand-rewritten: question 65->47 chars, answers 93->18 chars
UPDATE public.questions SET
    question_text = 'What sets the direction Muslims face in prayer?',
    correct_answer = 'Where Mecca lies',
    incorrect_answers = '["Always due east", "The time of day", "The nearest mosque"]'::jsonb,
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
  WHERE id = '3c3cf5e4-9c7f-4837-9ffc-aabc9512a065';

-- What distinctive articulatory mechanism characterizes Khoisan click consonants?
--   hand-rewritten: question 79->42 chars, answers 61->20 chars
UPDATE public.questions SET
    question_text = 'How are Khoisan click consonants produced?',
    correct_answer = 'Ingressive airstream',
    incorrect_answers = '["Ejective stops", "Pulmonic egressive", "Extreme tone shifts"]'::jsonb,
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
  WHERE id = '7bce9932-edb8-42ad-a307-9b77fc080f3b';

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

-- What geographic factor causes iodine deficiency in a region?
--   hand-rewritten: question 60->48 chars, answers 15->20 chars
UPDATE public.questions SET
    question_text = 'What geographic factor causes iodine deficiency?',
    correct_answer = 'Glaciation and rain',
    incorrect_answers = '["High nitrogen soil", "Frequent earthquakes", "Wide river deltas"]'::jsonb,
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
  WHERE id = '81036a13-3910-47f3-b1e2-086a9a7e7f65';

-- What is 0! (factorial of 0)?
--   hand-rewritten: question 28->31 chars, answers 13->10 chars
UPDATE public.questions SET
    question_text = 'What does zero factorial equal?',
    correct_answer = 'One',
    incorrect_answers = '["Zero", "Impossible", "Undefined"]'::jsonb,
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
  WHERE id = 'e2b3fed1-953f-4994-b042-d2b3e9c5bedf';

-- What is gravitational constant?
--   hand-rewritten: question 31->48 chars, answers 1->8 chars
UPDATE public.questions SET
    question_text = 'Which letter denotes the gravitational constant?',
    correct_answer = 'Big G',
    incorrect_answers = '["Little g", "Little c", "Little h"]'::jsonb,
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
  WHERE id = '64bdf00e-1035-4f96-b70c-631002cfebc7';

-- What is max character count for a tweet?
--   hand-rewritten: question 40->47 chars, answers 9->5 chars
UPDATE public.questions SET
    question_text = 'What is the character limit for a single tweet?',
    correct_answer = '280',
    incorrect_answers = '["140", "500", "1,000"]'::jsonb,
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
  WHERE id = 'ba61bf84-447d-4825-ae61-2944ad4a686a';

-- What is name of robot collecting trash in film?
--   hand-rewritten: question 47->47 chars, answers 8->8 chars
UPDATE public.questions SET
    question_text = 'Which film robot compacts and collects rubbish?',
    correct_answer = 'WALL-E',
    incorrect_answers = '["Johnny 5", "R2-D2", "Bender"]'::jsonb,
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
  WHERE id = 'aa4e81d8-20ba-457e-adec-637dbb38ec16';

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

-- What is the primary function of the lenses in a light microscope when observing animal cell structures?
--   hand-rewritten: question 103->44 chars, answers 63->20 chars
UPDATE public.questions SET
    question_text = 'What do the lenses in a light microscope do?',
    correct_answer = 'Magnify the specimen',
    incorrect_answers = '["Generate the light", "Stain the cells", "Absorb stray colour"]'::jsonb,
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
  WHERE id = '85efc4fa-1388-4b73-9d51-0fb636286081';

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

-- What is the scientific community's established view regarding the predictive power of horoscopes?
--   hand-rewritten: question 97->50 chars, answers 54->18 chars
UPDATE public.questions SET
    question_text = 'What does science say about horoscope predictions?',
    correct_answer = 'No basis for them',
    incorrect_answers = '["Often accurate", "Backed by physics", "Planets steer fate"]'::jsonb,
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
  WHERE id = '75d45d4a-584d-419a-b319-6a2b2f823ef2';

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

-- What is the scientific consensus regarding the existence of spontaneous human combustion?
--   hand-rewritten: question 89->37 chars, answers 58->20 chars
UPDATE public.questions SET
    question_text = 'Is spontaneous human combustion real?',
    correct_answer = 'No evidence for it',
    incorrect_answers = '["Confirmed but rare", "Caused by methane", "Possible in extremes"]'::jsonb,
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
  WHERE id = '5435b539-bfbd-4965-ae0a-911326460d43';

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

-- What nearly caused the Apollo 13 mission to be lost?
--   hand-rewritten: answers 18->20 chars
UPDATE public.questions SET
    question_text = 'What nearly caused the Apollo 13 mission to be lost?',
    correct_answer = 'An oxygen tank blast',
    incorrect_answers = '["A solar flare hit", "A meteor collision", "A fuel line leak"]'::jsonb,
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
  WHERE id = '6c7eb792-ec18-4037-83fa-73ab1eafd842';

-- What notation denotes a biconditional logical relationship?
--   hand-rewritten: question 59->46 chars, answers 6->14 chars
UPDATE public.questions SET
    question_text = 'Which symbol denotes a biconditional in logic?',
    correct_answer = 'A double arrow',
    incorrect_answers = '["A single arrow", "A right arrow", "A triple bar"]'::jsonb,
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
  WHERE id = 'af1f456c-d5ae-4866-a371-99e65c27e261';

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

-- What phonetic notation describes the schwa sound symbol?
--   hand-rewritten: question 56->36 chars, answers 17->16 chars
UPDATE public.questions SET
    question_text = 'Which symbol writes the schwa sound?',
    correct_answer = 'An upside-down e',
    incorrect_answers = '["A reversed a", "A dotted e", "An accented e"]'::jsonb,
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
  WHERE id = 'd5c2bacd-2881-4b8a-b09b-913b7e399cf2';

-- What principle describes the early placement of 'ἄν' in Greek?
--   hand-rewritten: question 62->46 chars, answers 19->17 chars
UPDATE public.questions SET
    question_text = 'Which law places ''an'' early in a Greek clause?',
    correct_answer = 'Wackernagel''s Law',
    incorrect_answers = '["Grimm''s Law", "Grassmann''s Law", "Verner''s Law"]'::jsonb,
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
  WHERE id = 'ae77d6ee-95a7-4458-b931-f1b4587186b8';

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

-- What significant hazard does ocean acidification pose to marine ecosystems?
--   hand-rewritten: question 75->48 chars, answers 81->19 chars
UPDATE public.questions SET
    question_text = 'What does ocean acidification do to marine life?',
    correct_answer = 'Weakens shells',
    incorrect_answers = '["Speeds coral growth", "Raises fish numbers", "Warms the water"]'::jsonb,
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
  WHERE id = '1a3c3d61-7d00-41ec-8a56-ab53d9e427be';

-- What symbol denotes the male organism in biology?
--   hand-rewritten: question 49->48 chars, answers 16->18 chars
UPDATE public.questions SET
    question_text = 'Which symbol denotes a male organism in biology?',
    correct_answer = 'The Mars symbol',
    incorrect_answers = '["The Venus symbol", "The Earth symbol", "The Mercury symbol"]'::jsonb,
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
  WHERE id = 'c2d30d85-6850-47ef-a9df-28bd273427c0';

-- What symbol represents energy flow in food chains?
--   hand-rewritten: question 50->47 chars, answers 17->14 chars
UPDATE public.questions SET
    question_text = 'Which symbol shows energy flow in a food chain?',
    correct_answer = 'A single arrow',
    incorrect_answers = '["A double arrow", "A wavy line", "An equals sign"]'::jsonb,
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
  WHERE id = 'cb97935d-1b5e-4585-abbb-294e3c2d4767';

-- What symbol represents the ascending lunar node?
--   hand-rewritten: question 48->44 chars, answers 18->18 chars
UPDATE public.questions SET
    question_text = 'Which symbol marks the ascending lunar node?',
    correct_answer = 'The dragon''s head',
    incorrect_answers = '["The dragon''s tail", "The open square", "The crossed circle"]'::jsonb,
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
  WHERE id = 'e9d1d16f-aee3-4ba9-8067-c69570307fd1';

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

-- What temperature does water freeze at in Celsius scale?
--   hand-rewritten: question 55->46 chars
UPDATE public.questions SET
    question_text = 'At what Celsius temperature does water freeze?',
    correct_answer = '0',
    incorrect_answers = '["4", "-4", "32"]'::jsonb,
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
  WHERE id = '737e151f-d963-4828-9a7b-000666a3ed2c';

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

-- What was a common misconception held by early ecologists regarding the primary role of predators in an ecosystem?
--   hand-rewritten: question 113->52 chars, answers 71->20 chars
UPDATE public.questions SET
    question_text = 'What did early ecologists get wrong about predators?',
    correct_answer = 'That they only harm',
    incorrect_answers = '["They cull the sick", "They change nothing", "They enrich the soil"]'::jsonb,
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
  WHERE id = '7b4293c8-fc45-4940-a6ec-858cfa772bec';

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

-- What was the first version of the Internet called?
--   hand-rewritten: answers 8->8 chars
UPDATE public.questions SET
    question_text = 'What was the first version of the Internet called?',
    correct_answer = 'ARPANET',
    incorrect_answers = '["Intranet", "Ethernet", "Usenet"]'::jsonb,
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
  WHERE id = 'b38513d2-5f17-4977-b523-55affc81f86b';

-- What was the primary linguistic challenge faced by participants at the ancient Olympic Games?
--   hand-rewritten: question 93->56 chars, answers 85->19 chars
UPDATE public.questions SET
    question_text = 'What language problem did ancient Olympic athletes face?',
    correct_answer = 'Many Greek dialects',
    incorrect_answers = '["Non-Greek languages", "Different scripts", "No shared language"]'::jsonb,
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
  WHERE id = '8d125a6a-931f-4e21-8d43-b73fb15e73cd';

-- What was the primary long-term impact of the Harambe incident on zoo operations?
--   hand-rewritten: question 80->45 chars, answers 50->20 chars
UPDATE public.questions SET
    question_text = 'What did the Harambe incident change at zoos?',
    correct_answer = 'Enclosure safety',
    incorrect_answers = '["More gorillas born", "Attendance collapsed", "Virtual exhibits"]'::jsonb,
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
  WHERE id = '27c09c4f-0588-4ace-9c97-466d024ea1a2';

-- What was the primary technical difference in pottery glazing techniques between ancient China and ancient Rome?
--   hand-rewritten: question 111->48 chars, answers 95->19 chars
UPDATE public.questions SET
    question_text = 'How did Chinese and Roman pottery glazes differ?',
    correct_answer = 'High-fired vs lead',
    incorrect_answers = '["Rome glazed first", "They were identical", "Neither had glazes"]'::jsonb,
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
  WHERE id = '27a962b0-fe9f-490f-9d3f-e70e77f64877';

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

-- When is absolute zero for gas?
--   hand-rewritten: question 30->33 chars, answers 10->7 chars
UPDATE public.questions SET
    question_text = 'What is absolute zero in Celsius?',
    correct_answer = '-273.15',
    incorrect_answers = '["0", "100", "-100"]'::jsonb,
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
  WHERE id = '826b1521-952a-40cb-801f-c27922759256';

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

-- Which animal had a grumpy meme?
--   hand-rewritten: question 31->44 chars, answers 15->12 chars
UPDATE public.questions SET
    question_text = 'Which animal fronted a famously grumpy meme?',
    correct_answer = 'Grumpy Cat',
    incorrect_answers = '["Doge", "Keyboard Cat", "Nyan Cat"]'::jsonb,
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
  WHERE id = '32dafaff-66f3-4bee-83ee-e882ea879455';

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

-- Which blood types are in ABO system?
--   hand-rewritten: question 36->42 chars, answers 17->18 chars
UPDATE public.questions SET
    question_text = 'Which blood groups make up the ABO system?',
    correct_answer = 'A, B, AB, O',
    incorrect_answers = '["Lewis, Kell, Duffy", "M, N, S, P", "Rh, Kidd, Lutheran"]'::jsonb,
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
  WHERE id = '1f005aa5-8d6c-4d7c-8bf0-115393dae7e7';

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

-- Which chemical process is primarily responsible for the tarnishing of many common metals, such as silver?
--   hand-rewritten: question 105->39 chars, answers 51->20 chars
UPDATE public.questions SET
    question_text = 'What chemical process tarnishes silver?',
    correct_answer = 'Reaction with sulfur',
    incorrect_answers = '["Dust building up", "Magnetic fields", "Wear from handling"]'::jsonb,
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
  WHERE id = '797828a1-3283-4387-ac11-36f256407346';

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

-- Which four elements were officially named and added to the periodic table by the IUPAC in 2016?
--   hand-rewritten: question 95->50 chars, answers 52->10 chars
UPDATE public.questions SET
    question_text = 'Which element added in 2016 was named after Japan?',
    correct_answer = 'Nihonium',
    incorrect_answers = '["Moscovium", "Tennessine", "Oganesson"]'::jsonb,
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
  WHERE id = '8e569cdb-0bd7-4c2c-ace1-7b2cb96f914d';

-- Which fundamental property of logarithms simplifies complex calculations involving large numbers?
--   hand-rewritten: question 97->49 chars, answers 55->20 chars
UPDATE public.questions SET
    question_text = 'Which property of logarithms simplifies big sums?',
    correct_answer = 'Products become sums',
    incorrect_answers = '["No decimals needed", "All become primes", "Integers only"]'::jsonb,
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
  WHERE id = '2d52cfff-950a-4670-b063-9147a807e4df';

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

-- Which ideology did the Nazi regime primarily aim to promote during the 1936 Berlin Olympics?
--   hand-rewritten: question 92->55 chars, answers 89->20 chars
UPDATE public.questions SET
    question_text = 'What did the Nazis promote at the 1936 Berlin Olympics?',
    correct_answer = 'Aryan superiority',
    incorrect_answers = '["Global cooperation", "Socialist prosperity", "Cultural diversity"]'::jsonb,
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
  WHERE id = '6381e9ec-c714-4057-ad5a-e7b138fa1e58';

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

-- Which of the following aspects of Greek combat sports significantly influenced hoplite training?
--   hand-rewritten: question 96->50 chars, answers 66->19 chars
UPDATE public.questions SET
    question_text = 'How did Greek combat sport shape hoplite training?',
    correct_answer = 'Built strength',
    incorrect_answers = '["Taught cavalry work", "Trained archery", "Favoured duelling"]'::jsonb,
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
  WHERE id = '2769dbd6-fd80-400e-a20f-9b3633e37f29';

-- Which of the following best characterizes the end of the Western Roman Empire?
--   hand-rewritten: question 78->46 chars, answers 58->20 chars
UPDATE public.questions SET
    question_text = 'How did the Western Roman Empire actually end?',
    correct_answer = 'A slow decline',
    incorrect_answers = '["One sudden collapse", "Gone in a decade", "All influence ceased"]'::jsonb,
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
  WHERE id = '443bb647-a2e2-4bc5-a8f7-8a61054d8bda';

-- Which of the following best describes a key aspect of doping control in the modern Olympic Games?
--   hand-rewritten: question 97->48 chars, answers 49->20 chars
UPDATE public.questions SET
    question_text = 'How is doping controlled at the modern Olympics?',
    correct_answer = 'Mandatory testing',
    incorrect_answers = '["Doping has ended", "Athletes self-report", "Only medallists"]'::jsonb,
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
  WHERE id = '66f974b5-9a45-485f-8aaf-d7a18921901d';

-- Which of the following best explains why sleep deprivation impairs cognitive performance?
--   hand-rewritten: question 89->34 chars, answers 82->20 chars
UPDATE public.questions SET
    question_text = 'Why does lost sleep hurt thinking?',
    correct_answer = 'Memory fails to set',
    incorrect_answers = '["It boosts creativity", "Waste clears faster", "Only the body tires"]'::jsonb,
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
  WHERE id = '31b03b51-5d53-4a97-8012-5f140b14b91d';

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

-- Which of the following is a direct consequence of insufficient training data in the development of narrow AI models?
--   hand-rewritten: question 116->57 chars, answers 54->20 chars
UPDATE public.questions SET
    question_text = 'What happens if an AI model has too little training data?',
    correct_answer = 'It fails on new data',
    incorrect_answers = '["It rejects all input", "Data volume is moot", "It becomes broad AI"]'::jsonb,
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
  WHERE id = '5528b2fa-7ba5-42f6-812b-502accdffddd';

-- Which of the following is a widely cited theory for the origin of the 15, 30, 40 scoring system in tennis?
--   hand-rewritten: question 106->49 chars, answers 74->16 chars
UPDATE public.questions SET
    question_text = 'Where does tennis''s 15, 30, 40 scoring come from?',
    correct_answer = 'A clock face',
    incorrect_answers = '["Games in a set", "Tournament ranks", "Points to win"]'::jsonb,
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
  WHERE id = '6c632360-9cbe-4ccc-a68e-5cb99ea2a0b0';

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

-- Which of the following lists contains three prominent personality classification systems?
--   hand-rewritten: question 89->51 chars, answers 55->19 chars
UPDATE public.questions SET
    question_text = 'Which three are personality classification systems?',
    correct_answer = 'Big 5, MBTI, DISC',
    incorrect_answers = '["Freud, Jung, Adler", "Blood, bone, humour", "Alpha, beta, gamma"]'::jsonb,
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
  WHERE id = '6435892b-fb77-46fd-a411-8ae2277350e7';

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

-- Which of these is a common misconception about the origin of the word "hello"?
--   hand-rewritten: question 78->45 chars, answers 64->17 chars
UPDATE public.questions SET
    question_text = 'What is the myth about the origin of "hello"?',
    correct_answer = 'Edison coined it',
    incorrect_answers = '["From Old English", "From French hola", "From sailor slang"]'::jsonb,
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
  WHERE id = '2913caa7-e3bb-45db-9c67-7f910ff4b4cc';

-- Which of these is a primary data source used to calculate the Consumer Price Index (CPI)?
--   hand-rewritten: question 89->49 chars, answers 55->17 chars
UPDATE public.questions SET
    question_text = 'What data is the Consumer Price Index built from?',
    correct_answer = 'A basket of goods',
    incorrect_answers = '["GDP figures", "Trade balances", "Stock indices"]'::jsonb,
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
  WHERE id = 'bf937fba-a1f9-4947-b656-d03d0daf0bd1';

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

-- Which of these quotes best reflects Serena Williams' philosophy on resilience?
--   hand-rewritten: question 78->49 chars, answers 98->20 chars
UPDATE public.questions SET
    question_text = 'What does Serena Williams say defines a champion?',
    correct_answer = 'How they recover',
    incorrect_answers = '["Champions are born", "Talent guarantees it", "Mostly plain luck"]'::jsonb,
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
  WHERE id = '51d522c1-a5f7-4425-b735-0601935f6cb1';

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

-- Which organization is the largest global computing society for education and research?
--   hand-rewritten: question 86->46 chars, answers 50->4 chars
UPDATE public.questions SET
    question_text = 'Which is the largest global computing society?',
    correct_answer = 'ACM',
    incorrect_answers = '["IEEE", "ISO", "IETF"]'::jsonb,
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
  WHERE id = '800197ae-cd8d-4155-b9b5-955237585d9b';

-- Which organization provides board certification for specialty areas in professional psychology in the United States?
--   hand-rewritten: question 116->53 chars, answers 72->6 chars
UPDATE public.questions SET
    question_text = 'Who board-certifies psychology specialties in the US?',
    correct_answer = 'ABPP',
    incorrect_answers = '["APA", "AMA", "CACREP"]'::jsonb,
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
  WHERE id = '87843c28-4cdb-4f9c-83e6-670b525ae62e';

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

-- Which statement accurately describes the susceptibility of sharks to cancer?
--   hand-rewritten: question 76->22 chars, answers 84->17 chars
UPDATE public.questions SET
    question_text = 'Can sharks get cancer?',
    correct_answer = 'Yes, but rarely',
    incorrect_answers = '["No, fully immune", "They kill tumours", "They spread it"]'::jsonb,
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
  WHERE id = '47294b3b-56a9-4378-b22b-5bdb16c241dc';

-- Which statement accurately describes the voting process for the final winners of the Academy Awards?
--   hand-rewritten: question 100->46 chars, answers 93->16 chars
UPDATE public.questions SET
    question_text = 'Who votes for the final Academy Award winners?',
    correct_answer = 'Academy members',
    incorrect_answers = '["A critics'' panel", "The box office", "A public poll"]'::jsonb,
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
  WHERE id = '5d141e94-039a-4856-b950-a2f9a2975893';

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

-- Which statement best describes the intended audience for the medium of manga as a whole?
--   hand-rewritten: question 88->25 chars, answers 61->20 chars
UPDATE public.questions SET
    question_text = 'Who is manga written for?',
    correct_answer = 'All ages and genders',
    incorrect_answers = '["Young children only", "Teenagers only", "Adult readers only"]'::jsonb,
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
  WHERE id = '4d145eb5-32c5-485a-989d-7a907c93f2ef';

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

-- Which was 1st atomic bomb used in war?
--   hand-rewritten: question 38->40 chars, answers 10->10 chars
UPDATE public.questions SET
    question_text = 'Which atomic bomb was first used in war?',
    correct_answer = 'Little Boy',
    incorrect_answers = '["Trinity", "Fat Man", "Big Boy"]'::jsonb,
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
  WHERE id = '68488a8c-4e0c-4aa4-8965-2e1fbb53c09e';

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

-- Why do deciduous trees shed leaves before winter?
--   hand-rewritten: answers 20->19 chars
UPDATE public.questions SET
    question_text = 'Why do deciduous trees shed leaves before winter?',
    correct_answer = 'To save water',
    incorrect_answers = '["To draw pollinators", "To grow taller", "To catch more light"]'::jsonb,
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
  WHERE id = '79ff3952-0aa1-45d3-b3cd-3f47b5517052';

-- Why do hash collisions typically reduce the lookup efficiency of a hash table?
--   hand-rewritten: question 78->46 chars, answers 88->20 chars
UPDATE public.questions SET
    question_text = 'Why do hash collisions slow down a hash table?',
    correct_answer = 'Extra probing needed',
    incorrect_answers = '["Memory fragments", "CPU cache misses", "Pointers fail"]'::jsonb,
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
  WHERE id = '85c62e13-d636-4024-b807-1f6156210965';

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

-- Why is the acceleration due to gravity (g) lower at the Earth's equator than at the poles?
--   hand-rewritten: question 90->52 chars, answers 52->15 chars
UPDATE public.questions SET
    question_text = 'Why is gravity weaker at the equator than the poles?',
    correct_answer = 'Spin and bulge',
    incorrect_answers = '["Air pressure", "Solar radiation", "Ocean tides"]'::jsonb,
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
  WHERE id = '64c9a1f4-a3da-4937-babf-f7ca79c281ca';


-- ── 3. repaired but staged in the Library for review (158) ──────
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

-- According to Friedrich Nietzsche, what was the primary outcome of the "slave revolt in morality"?
--   hand-rewritten: question 97->58 chars, answers 102->22 chars
UPDATE public.questions SET
    question_text = 'What did Nietzsche say the ''slave revolt'' in morality did?',
    correct_answer = 'It inverted values',
    incorrect_answers = '["It restored the nobles", "It made one moral code", "It unified philosophy"]'::jsonb,
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
  WHERE id = 'fd6dd6bd-c881-4535-8781-810f6fe17b1e';

-- According to Le Chatelier's Principle, how does an equilibrium system respond to an external stress?
--   hand-rewritten: question 100->58 chars, answers 65->21 chars
UPDATE public.questions SET
    question_text = 'How does an equilibrium react to stress, per Le Chatelier?',
    correct_answer = 'It opposes the stress',
    incorrect_answers = '["It stays unchanged", "It amplifies it", "It speeds one way"]'::jsonb,
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
  WHERE id = 'b0ba858c-95f9-4fae-a463-3c2e98711062';

-- According to mainstream Christian theology, were demons originally created as inherently evil beings?
--   hand-rewritten: question 101->47 chars, answers 73->21 chars
UPDATE public.questions SET
    question_text = 'Were demons created evil in Christian theology?',
    correct_answer = 'No, they rebelled',
    incorrect_answers = '["Yes, from creation", "They are not evil", "An evil god made them"]'::jsonb,
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
  WHERE id = '4c866aa7-1cce-410a-a589-82474b14fab9';

-- According to the DSM-5, which of the following are the three main categories of phobia-related anxiety disorders?
--   hand-rewritten: question 113->52 chars, answers 53->23 chars
UPDATE public.questions SET
    question_text = 'What are the three phobia-related anxiety disorders?',
    correct_answer = 'Specific, social, agora',
    incorrect_answers = '["Object, place, animal", "Fear, anxiety, trauma", "Mild, moderate, severe"]'::jsonb,
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
  WHERE id = '38a1d181-7bab-4aa8-935b-a3ee03cead31';

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

-- Can an individual under hypnosis be compelled to perform actions that go against their fundamental will or moral code?
--   hand-rewritten: question 118->51 chars, answers 85->22 chars
UPDATE public.questions SET
    question_text = 'Can hypnosis make someone act against their morals?',
    correct_answer = 'No, it cannot',
    incorrect_answers = '["Yes, anything at all", "Yes, total control", "Yes, if skilled enough"]'::jsonb,
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
  WHERE id = 'b80bdf0b-4d27-4fa8-aa5a-a10964f5222d';

-- Could a native speaker of Old English have understood the English spoken by William Shakespeare?
--   hand-rewritten: question 96->52 chars, answers 81->21 chars
UPDATE public.questions SET
    question_text = 'Could an Old English speaker understand Shakespeare?',
    correct_answer = 'No, far too different',
    incorrect_answers = '["Yes, nearly the same", "Partly, with effort", "Nobody can tell"]'::jsonb,
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
  WHERE id = '61dca268-5dc3-43ac-8330-1f6360adec62';

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

-- Does pure water always freeze at precisely 0°C (32°F) under all environmental conditions?
--   hand-rewritten: question 89->45 chars, answers 72->20 chars
UPDATE public.questions SET
    question_text = 'Does pure water always freeze at exactly 0°C?',
    correct_answer = 'No, pressure matters',
    incorrect_answers = '["Yes, always", "Yes, at sea level", "No, always lower"]'::jsonb,
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
  WHERE id = '6f38b748-fc30-41ff-9093-3dfa4e0b970f';

-- Does scientific evidence support the common belief that sugar consumption directly causes hyperactivity in children?
--   hand-rewritten: question 116->37 chars, answers 76->22 chars
UPDATE public.questions SET
    question_text = 'Does sugar make children hyperactive?',
    correct_answer = 'No, studies say no',
    incorrect_answers = '["Yes, in most children", "Yes, it is a stimulant", "Yes, in the very young"]'::jsonb,
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
  WHERE id = 'b79e625b-331c-43a9-aff1-69abebe04441';

-- Does the Earth's equator pass directly through the geographical center of the African continent?
--   hand-rewritten: question 96->50 chars, answers 116->23 chars
UPDATE public.questions SET
    question_text = 'Does the equator run through the centre of Africa?',
    correct_answer = 'No, the centre is north',
    incorrect_answers = '["Yes, it bisects it", "Yes, per old maps", "No, it misses Africa"]'::jsonb,
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
  WHERE id = '4529b637-2f2f-4bf4-89bf-674d2cca6bc4';

-- During pharmaceutical earnings calls, what is a common criticism regarding the valuation of drug pipelines?
--   hand-rewritten: question 107->58 chars, answers 73->22 chars
UPDATE public.questions SET
    question_text = 'What do analysts criticise about drug pipeline valuations?',
    correct_answer = 'Approval odds too high',
    incorrect_answers = '["Market size too low", "R&D costs are hidden", "Patents are ignored"]'::jsonb,
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
  WHERE id = 'd0ce8b64-b285-47d7-9012-f86b74a0628f';

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

-- Has Facebook ever confirmed using a smartphone's camera to record users for ad targeting purposes?
--   hand-rewritten: question 98->59 chars, answers 90->21 chars
UPDATE public.questions SET
    question_text = 'Has Facebook admitted using phone cameras for ad targeting?',
    correct_answer = 'No, it denies it',
    incorrect_answers = '["Yes, it admitted it", "Yes, it runs hidden", "No, but it tracks use"]'::jsonb,
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
  WHERE id = 'b094fab5-7d68-4fed-95ea-7be586807b60';

-- Historically, did Vikings wear helmets adorned with horns?
--   hand-rewritten: question 58->32 chars, answers 87->23 chars
UPDATE public.questions SET
    question_text = 'Did Vikings wear horned helmets?',
    correct_answer = 'No, a 19th-century myth',
    incorrect_answers = '["Yes, widely in battle", "Yes, as a status symbol", "Yes, for ceremonies"]'::jsonb,
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
  WHERE id = 'd9c94f16-b5ba-4665-9100-7a88498a9838';

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

-- How can communities build resilience after an earthquake (PTG)?
--   hand-rewritten: question 63->53 chars, answers 28->22 chars
UPDATE public.questions SET
    question_text = 'How do communities grow stronger after an earthquake?',
    correct_answer = 'New bonds form',
    incorrect_answers = '["They split for good", "Outside aid does it", "Nothing really changes"]'::jsonb,
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
  WHERE id = 'b7d56cbf-2e98-41ac-9f60-c1f603dc3e8e';

-- How did chlorofluorocarbons affect the atmosphere?
--   hand-rewritten: answers 19->21 chars
UPDATE public.questions SET
    question_text = 'How did chlorofluorocarbons affect the atmosphere?',
    correct_answer = 'Antarctic ozone hole',
    incorrect_answers = '["Strengthened ozone", "No effect at all", "Only ground-level air"]'::jsonb,
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
  WHERE id = '51634eac-d09b-44aa-a203-b7a8a24091f5';

-- How did social media significantly influence the 2011 Arab Spring uprisings?
--   hand-rewritten: question 76->48 chars, answers 99->22 chars
UPDATE public.questions SET
    question_text = 'How did social media shape the 2011 Arab Spring?',
    correct_answer = 'It helped organising',
    incorrect_answers = '["It spread state spin", "It had no real effect", "It only reported after"]'::jsonb,
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
  WHERE id = 'efb26ba3-6f8a-444b-85af-e73a81fb9a60';

-- How did the advent of printing technology primarily influence regional language development?
--   hand-rewritten: question 92->43 chars, answers 71->22 chars
UPDATE public.questions SET
    question_text = 'How did printing change regional languages?',
    correct_answer = 'It standardised them',
    incorrect_answers = '["Dialects multiplied", "All variation ended", "Only local speech grew"]'::jsonb,
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
  WHERE id = '8e99cd1a-a99f-47aa-b80c-e76be6cb1d95';

-- How did the construction of the Panama Canal significantly impact trade between the Atlantic and Pacific Oceans?
--   hand-rewritten: question 112->44 chars, answers 99->21 chars
UPDATE public.questions SET
    question_text = 'How did the Panama Canal change ocean trade?',
    correct_answer = 'Cut out Cape Horn',
    incorrect_answers = '["Linked river systems", "Diverted the Amazon", "Crossed North America"]'::jsonb,
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
  WHERE id = '5ab2ceed-5d10-4551-8294-db730f83b3c7';

-- How did the invention of the printing press significantly impact the daily sharing of information?
--   hand-rewritten: question 98->47 chars, answers 90->22 chars
UPDATE public.questions SET
    question_text = 'How did the printing press change sharing news?',
    correct_answer = 'Made print affordable',
    incorrect_answers = '["Ended written language", "Only printed bibles", "Held literacy back"]'::jsonb,
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
  WHERE id = '3a2a59a8-1cce-425e-bb46-803e8d0b23ef';

-- How did the widespread availability of cheap internet bandwidth primarily influence the speed of meme virality?
--   hand-rewritten: question 111->47 chars, answers 62->22 chars
UPDATE public.questions SET
    question_text = 'How did cheap bandwidth speed up meme virality?',
    correct_answer = 'Instant global sharing',
    incorrect_answers = '["Screens got sharper", "Hosting got cheaper", "Images looked better"]'::jsonb,
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
  WHERE id = 'f1de0348-129d-46ff-a73e-8fba28cda5a1';

-- How do bats navigate using echolocation?
--   hand-rewritten: question 40->37 chars, answers 74->22 chars
UPDATE public.questions SET
    question_text = 'How do bats navigate by echolocation?',
    correct_answer = 'They read sound echoes',
    incorrect_answers = '["They follow scents", "They see in the dark", "They sense magnetism"]'::jsonb,
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
  WHERE id = 'ee9c9a8c-4d05-4848-8a6b-11176fe55525';

-- How do mycorrhizal fungi primarily aid plant nutrient absorption?
--   hand-rewritten: question 65->42 chars, answers 104->24 chars
UPDATE public.questions SET
    question_text = 'How do mycorrhizal fungi help plants feed?',
    correct_answer = 'They extend the roots',
    incorrect_answers = '["They eat spare nutrients", "They fix nitrogen", "They make sugars"]'::jsonb,
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
  WHERE id = 'b399fe75-5ca4-4412-ae8d-c4401a013486';

-- How do radon emissions increase lung cancer risk?
--   hand-rewritten: answers 21->21 chars
UPDATE public.questions SET
    question_text = 'How do radon emissions increase lung cancer risk?',
    correct_answer = 'Alpha particle damage',
    incorrect_answers = '["Acute radiation burns", "It blocks oxygen", "It raises blood CO₂"]'::jsonb,
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
  WHERE id = '4d61d5b1-b605-4c91-adc6-58ebbb606312';

-- How do significant weather events typically influence global coffee prices?
--   hand-rewritten: question 75->47 chars, answers 90->20 chars
UPDATE public.questions SET
    question_text = 'How does bad weather move global coffee prices?',
    correct_answer = 'Prices rise',
    incorrect_answers = '["No effect at all", "Prices fall sharply", "Stockpiles absorb it"]'::jsonb,
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
  WHERE id = '3c3031ab-c70d-438a-aa86-72bbb5a953cb';

-- How does Jupiter's Great Red Spot primarily interact with the planet's atmosphere?
--   hand-rewritten: question 82->33 chars, answers 99->21 chars
UPDATE public.questions SET
    question_text = 'What is Jupiter''s Great Red Spot?',
    correct_answer = 'A lasting storm',
    incorrect_answers = '["A solid core feature", "A gas-liquid boundary", "A magnetic anomaly"]'::jsonb,
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
  WHERE id = 'b5238ba9-8d3b-4602-b990-3ec27e08ce84';

-- How does inflammation primarily contribute to the body's healing process?
--   hand-rewritten: question 73->41 chars, answers 70->21 chars
UPDATE public.questions SET
    question_text = 'How does inflammation help the body heal?',
    correct_answer = 'Calls in immune cells',
    incorrect_answers = '["Cuts blood flow", "Blocks immune cells", "Lowers white cells"]'::jsonb,
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
  WHERE id = '7693acc8-55b5-4504-b420-9cd04eb2bf36';

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

-- In Greek mythology, which three major groups of deities are often distinguished by their generation or primary domain?
--   hand-rewritten: question 118->44 chars, answers 60->29 chars
UPDATE public.questions SET
    question_text = 'Which three groups divide the Greek deities?',
    correct_answer = 'Olympians, Titans, Chthonic',
    incorrect_answers = '["Primordials, heroes, monsters", "Sky, sea and underworld gods", "Nymphs, satyrs, centaurs"]'::jsonb,
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
  WHERE id = 'd6330218-9646-40ae-afea-62734b32d5d4';

-- In astrophysics, what is a black hole fundamentally considered to be?
--   hand-rewritten: question 69->37 chars, answers 62->21 chars
UPDATE public.questions SET
    question_text = 'What is a black hole in astrophysics?',
    correct_answer = 'A gravity well',
    incorrect_answers = '["A tear in space", "A tunnel between eras", "A door to a universe"]'::jsonb,
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
  WHERE id = '8b405416-9d1f-4c9d-be8a-3abce3529bdf';

-- In baking, what is the most direct consequence of significantly altering the specified proportions of ingredients?
--   hand-rewritten: question 114->52 chars, answers 56->22 chars
UPDATE public.questions SET
    question_text = 'What happens if you change baking ingredient ratios?',
    correct_answer = 'Texture and rise shift',
    incorrect_answers = '["Cook time adjusts", "Only looks change", "Only cost changes"]'::jsonb,
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
  WHERE id = '1c4ab279-eb31-4fb2-b343-031bd4c22416';

-- In biological taxonomy, what specific notation is used to indicate a hybrid organism?
--   hand-rewritten: question 85->50 chars, answers 113->21 chars
UPDATE public.questions SET
    question_text = 'What notation marks a hybrid organism in taxonomy?',
    correct_answer = 'A multiplication sign',
    incorrect_answers = '["A plus sign", "An ampersand", "A dollar sign"]'::jsonb,
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
  WHERE id = '40dbbfc7-be08-4d79-ba8c-a031dfaf07d8';

-- In economics, which of the following best defines inflation?
--   hand-rewritten: question 60->32 chars, answers 84->22 chars
UPDATE public.questions SET
    question_text = 'In economics, what is inflation?',
    correct_answer = 'Prices rising steadily',
    incorrect_answers = '["A shrinking workforce", "A long recession", "Money moving slower"]'::jsonb,
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
  WHERE id = 'b7844462-ce58-4cc1-a12f-895586f417b2';

-- In internet terminology, what does it mean to 'troll'?
--   hand-rewritten: question 54->37 chars, answers 92->22 chars
UPDATE public.questions SET
    question_text = 'Online, what does it mean to ''troll''?',
    correct_answer = 'Post to provoke',
    incorrect_answers = '["Search for information", "Make fake accounts", "Leak private data"]'::jsonb,
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
  WHERE id = '5b48bdec-b538-4e0f-9173-eea2a95fab18';

-- In the context of crime dramas, which common exaggeration about criminal psychology is frequently depicted?
--   hand-rewritten: question 107->53 chars, answers 99->22 chars
UPDATE public.questions SET
    question_text = 'What do crime dramas most exaggerate about criminals?',
    correct_answer = 'That they are geniuses',
    incorrect_answers = '["That profiling works", "That forensics is fast", "That all are ill"]'::jsonb,
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
  WHERE id = 'fd6757d2-f32b-4433-b6c8-dfdce38342ce';

-- In what way does the TikTok algorithm primarily facilitate identity exploration among youth?
--   hand-rewritten: question 92->51 chars, answers 62->21 chars
UPDATE public.questions SET
    question_text = 'How does TikTok help young people explore identity?',
    correct_answer = 'It shows subcultures',
    incorrect_answers = '["It narrows their view", "It pushes one ideal", "It cuts connection"]'::jsonb,
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
  WHERE id = '98ff923e-0402-4243-92d7-f1703c6f9bbc';

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

-- Is 'shopping addiction' clinically recognized as a distinct disorder by mental health professionals?
--   hand-rewritten: question 100->53 chars, answers 98->22 chars
UPDATE public.questions SET
    question_text = 'Is shopping addiction a recognised clinical disorder?',
    correct_answer = 'Yes, compulsive buying',
    incorrect_answers = '["No, just bad budgeting", "No, weak self-control", "No, only a symptom"]'::jsonb,
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
  WHERE id = 'c4310c1b-7fd3-4a48-ae53-b0dcb7ade3f1';

-- Memory reconstruction studies primarily contradict which of the following common beliefs about human recall?
--   hand-rewritten: question 108->60 chars, answers 65->23 chars
UPDATE public.questions SET
    question_text = 'What belief about memory do reconstruction studies disprove?',
    correct_answer = 'That it records exactly',
    incorrect_answers = '["That it rebuilds", "That hints sway it", "That witnesses err"]'::jsonb,
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
  WHERE id = 'ae0a1f17-0caa-4b7a-99f8-3ef553101210';

-- Regarding the duration and reversibility of ocean dead zones, what was a common scientific misconception?
--   hand-rewritten: question 105->58 chars, answers 63->23 chars
UPDATE public.questions SET
    question_text = 'What did scientists once get wrong about ocean dead zones?',
    correct_answer = 'That they never recover',
    incorrect_answers = '["They are tropical only", "Volcanoes cause them", "They are always visible"]'::jsonb,
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
  WHERE id = 'b5afe9de-dd72-4d1f-b543-d2e6f1f6e5df';

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

-- Was the Leaning Tower of Pisa originally designed to have its characteristic tilt?
--   hand-rewritten: question 82->44 chars, answers 93->21 chars
UPDATE public.questions SET
    question_text = 'Was the Leaning Tower of Pisa meant to lean?',
    correct_answer = 'No, the soil gave way',
    incorrect_answers = '["Yes, by design", "Yes, for wind", "No, an earthquake"]'::jsonb,
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
  WHERE id = '71bfb733-954f-424d-9419-36923efb4e5d';

-- What AI creates new data with generator & discriminator?
--   hand-rewritten: question 56->46 chars, answers 12->14 chars
UPDATE public.questions SET
    question_text = 'Which AI uses a generator and a discriminator?',
    correct_answer = 'GANs',
    incorrect_answers = '["Transformers", "Autoencoders", "Random forests"]'::jsonb,
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
  WHERE id = 'a0531c23-2775-4073-9cd3-1252df9579b9';

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

-- What anime world has Nen?
--   hand-rewritten: question 25->27 chars, answers 15->15 chars
UPDATE public.questions SET
    question_text = 'Which anime world uses Nen?',
    correct_answer = 'Hunter x Hunter',
    incorrect_answers = '["Dragon Ball", "Yu Yu Hakusho", "Naruto"]'::jsonb,
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
  WHERE id = '24e57c02-54a5-4cad-9f05-8ce27cddeb26';

-- What are the primary routes through which lead exposure typically becomes toxic to humans?
--   hand-rewritten: question 90->48 chars, answers 62->23 chars
UPDATE public.questions SET
    question_text = 'How does lead typically get into the human body?',
    correct_answer = 'Eating, breathing, skin',
    incorrect_answers = '["Only as a liquid", "Only as a gas", "Only when molten"]'::jsonb,
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
  WHERE id = 'c4859815-85e6-4cf3-903a-2a8bcc4a43e9';

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

-- What does the skull emoji (💀) mean in internet slang?
--   hand-rewritten: question 53->38 chars, answers 41->23 chars
UPDATE public.questions SET
    question_text = 'What does the skull emoji mean online?',
    correct_answer = 'Dying of laughter',
    incorrect_answers = '["Literal death or danger", "Halloween excitement", "Sadness or despair"]'::jsonb,
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
  WHERE id = 'da8d1070-a6c9-4cdc-b78c-03f8a8cca90c';

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

-- What is a common myth surrounding the recording process of Queen's iconic song, "Bohemian Rhapsody"?
--   hand-rewritten: question 100->51 chars, answers 98->22 chars
UPDATE public.questions SET
    question_text = 'What is a myth about recording ''Bohemian Rhapsody''?',
    correct_answer = 'It was improvised',
    incorrect_answers = '["Mercury wrote it alone", "May sang the opera", "The demo was shorter"]'::jsonb,
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
  WHERE id = '3ee72f1d-46be-4b72-a920-2bc68cd93b61';

-- What is power of any non-zero number to zero (x^0)?
--   hand-rewritten: question 51->56 chars, answers 12->17 chars
UPDATE public.questions SET
    question_text = 'What is any non-zero number raised to the power of zero?',
    correct_answer = 'One',
    incorrect_answers = '["Zero", "The number itself", "Infinity"]'::jsonb,
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
  WHERE id = '47ffbaae-9976-48a9-99b9-6544932fe888';

-- What is result of multiplying zero by any number?
--   hand-rewritten: question 49->35 chars, answers 11->15 chars
UPDATE public.questions SET
    question_text = 'What is any number multiplied by 0?',
    correct_answer = 'Zero',
    incorrect_answers = '["The same number", "One", "Undefined"]'::jsonb,
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
  WHERE id = 'f0d6a7b5-ab2a-4ba1-9ce9-7ace5af66a19';

-- What number multiplies any number to give zero?
--   hand-rewritten: question 47->43 chars, answers 2->12 chars
UPDATE public.questions SET
    question_text = 'What number times any other always gives 0?',
    correct_answer = 'Zero',
    incorrect_answers = '["One", "Negative one", "Ten"]'::jsonb,
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
  WHERE id = '6bbb442b-663c-49dc-840b-05fe7b465f28';

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

-- What significant geographical fact did Ferdinand Magellan's expedition conclusively demonstrate?
--   hand-rewritten: question 96->50 chars, answers 54->21 chars
UPDATE public.questions SET
    question_text = 'What did Magellan''s expedition conclusively prove?',
    correct_answer = 'Earth can be circled',
    incorrect_answers = '["Earth is a sphere", "A west route to India", "America joins Asia"]'::jsonb,
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
  WHERE id = 'ccc36c38-3f6c-4cfd-9c7b-54a79f5644cc';

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

-- What surprising and significant role do viruses play in the process of evolution?
--   hand-rewritten: question 81->50 chars, answers 110->22 chars
UPDATE public.questions SET
    question_text = 'What surprising role do viruses play in evolution?',
    correct_answer = 'They move genes about',
    incorrect_answers = '["They stop mutations", "They play no real role", "They undo adaptations"]'::jsonb,
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
  WHERE id = 'de6a7906-bb1a-433d-a921-4606c76ff198';

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

-- What was Benjamin Franklin's primary contribution to the understanding of electricity?
--   hand-rewritten: question 86->50 chars, answers 56->21 chars
UPDATE public.questions SET
    question_text = 'What did Benjamin Franklin show about electricity?',
    correct_answer = 'Lightning is electric',
    incorrect_answers = '["He built the battery", "He found the electron", "He made static first"]'::jsonb,
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
  WHERE id = 'c9655f80-876e-4122-97ae-30c51f0c52e7';

-- What was Napoleon Bonaparte's actual height relative to the average Frenchman of his era?
--   hand-rewritten: question 89->46 chars, answers 64->21 chars
UPDATE public.questions SET
    question_text = 'How tall was Napoleon next to other Frenchmen?',
    correct_answer = 'About average',
    incorrect_answers = '["Far shorter", "Unusually tall", "Exactly five foot two"]'::jsonb,
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
  WHERE id = '8ba23b3c-a482-473d-bcb0-6a9479221d26';

-- What was a common media misconception regarding the actual scale of the "Tide Pod Challenge"?
--   hand-rewritten: question 93->58 chars, answers 57->23 chars
UPDATE public.questions SET
    question_text = 'What did the media get wrong about the Tide Pod Challenge?',
    correct_answer = 'That it was an epidemic',
    incorrect_answers = '["That it never happened", "That P&G promoted it", "That it hit one country"]'::jsonb,
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
  WHERE id = '422110ae-83c8-4d27-8894-227f3eba81ae';

-- What was the official White House explanation for Donald Trump's "Covfefe" tweet?
--   hand-rewritten: question 81->52 chars, answers 59->22 chars
UPDATE public.questions SET
    question_text = 'How did the White House explain the ''Covfefe'' tweet?',
    correct_answer = 'A few knew its meaning',
    incorrect_answers = '["It was a plain typo", "It was a foreign word", "The press made it up"]'::jsonb,
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
  WHERE id = 'f634d48d-b3dc-4064-9bb2-f288b3e229ba';

-- What was the primary overarching climate goal for the Paris 2024 Olympic and Paralympic Games?
--   hand-rewritten: question 94->52 chars, answers 56->21 chars
UPDATE public.questions SET
    question_text = 'What was the Paris 2024 Olympics'' main climate goal?',
    correct_answer = 'Halve the carbon',
    incorrect_answers = '["Carbon-neutral venues", "A vegan-only menu", "All-recycled venues"]'::jsonb,
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
  WHERE id = 'df3f738b-8bac-4cb7-8bdd-e1695b7810cd';

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

-- When classifying markets by their geographic scope, which sequence accurately represents an increasing order of reach?
--   hand-rewritten: question 118->59 chars, answers 49->21 chars
UPDATE public.questions SET
    question_text = 'Which order of markets goes from smallest to largest reach?',
    correct_answer = 'Local to global',
    incorrect_answers = '["Primary to quaternary", "Monopoly to perfect", "Small-cap to mega-cap"]'::jsonb,
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
  WHERE id = '71fec91c-309b-468f-99f5-efb22c2dd8f5';

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

-- Which biological process explains how alcohol is produced from sugar?
--   hand-rewritten: question 69->31 chars, answers 56->22 chars
UPDATE public.questions SET
    question_text = 'How is alcohol made from sugar?',
    correct_answer = 'Yeast ferments it',
    incorrect_answers = '["Heat converts it", "Bacteria release water", "It evaporates off"]'::jsonb,
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
  WHERE id = 'efa78763-e8bc-4581-842b-8aec811bf4c7';

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

-- Which common biohacking meme most inaccurately suggests that complex biological processes are easily manipulated?
--   hand-rewritten: question 113->51 chars, answers 83->22 chars
UPDATE public.questions SET
    question_text = 'Which biohacking claim most oversimplifies biology?',
    correct_answer = 'Habits beat genetics',
    incorrect_answers = '["Body as a machine", "Focus alters organs", "Pills replace pathways"]'::jsonb,
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
  WHERE id = '21149522-d0ff-4ec9-b8d2-d9bce9229100';

-- Which common portrayal in crime shows is most unrealistic when compared to real-world investigations?
--   hand-rewritten: question 101->51 chars, answers 65->24 chars
UPDATE public.questions SET
    question_text = 'What is least realistic in TV crime investigations?',
    correct_answer = 'Solved in one episode',
    incorrect_answers = '["Forensics always certain", "Frequent car chases", "Suspects confess fast"]'::jsonb,
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
  WHERE id = 'fe4432aa-711c-41a2-bae4-87445451e0cf';

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

-- Which five events comprised the ancient Greek pentathlon?
--   hand-rewritten: question 57->47 chars, answers 61->38 chars
UPDATE public.questions SET
    question_text = 'Which five events made up the Greek pentathlon?',
    correct_answer = 'Discus, javelin, jump, run, wrestle',
    incorrect_answers = '["Archery, boxing, chariot, run, wrestle", "Boxing, swim, run, javelin, discus", "Discus, javelin, jump, boxing, swim"]'::jsonb,
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
  WHERE id = '7b3aa038-4e86-47cd-a908-73baea8c08b9';

-- Which five events comprised the ancient Greek pentathlon?
--   hand-rewritten: question 57->53 chars, answers 61->14 chars
UPDATE public.questions SET
    question_text = 'Which event was part of the ancient Greek pentathlon?',
    correct_answer = 'The stade race',
    incorrect_answers = '["Chariot racing", "Boxing", "Pankration"]'::jsonb,
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
  WHERE id = '7b3aa038-4e86-47cd-a908-73baea8c08b9';

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

-- Which geometric condition is essential for detecting an exoplanet using the transit method?
--   hand-rewritten: question 91->57 chars, answers 71->21 chars
UPDATE public.questions SET
    question_text = 'What must an exoplanet''s orbit do for the transit method?',
    correct_answer = 'Sit nearly edge-on',
    incorrect_answers = '["Sit perpendicular", "Sit face-on", "Be perfectly circular"]'::jsonb,
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
  WHERE id = '5fa45696-2de2-42ba-acbb-e7e4b74c7de8';

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

-- Which meme shows family conflict, one member unhappy?
--   hand-rewritten: question 53->51 chars, answers 20->20 chars
UPDATE public.questions SET
    question_text = 'Which meme shows one family member visibly unhappy?',
    correct_answer = 'Disaster Girl',
    incorrect_answers = '["Hide the Pain Harold", "Grumpy Cat", "Distracted Boyfriend"]'::jsonb,
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
  WHERE id = '7b570a04-1919-4363-97ec-8abb27e2bf37';

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

-- Which number has no multiplicative inverse?
--   hand-rewritten: answers 8->12 chars
UPDATE public.questions SET
    question_text = 'Which number has no multiplicative inverse?',
    correct_answer = 'Zero',
    incorrect_answers = '["One", "Negative one", "Infinity"]'::jsonb,
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
  WHERE id = '694d58fd-b2d1-40a4-bc96-603d51165e34';

-- Which of the following accurately describes a significant danger posed by chemical weapons during World War I?
--   hand-rewritten: question 110->52 chars, answers 84->25 chars
UPDATE public.questions SET
    question_text = 'What harm did chemical weapons cause in World War I?',
    correct_answer = 'Burns and blindness',
    incorrect_answers = '["Widespread food poisoning", "Destroyed fortifications", "Only mental collapse"]'::jsonb,
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
  WHERE id = 'd33d13f8-83fa-4259-adef-a81807b975ee';

-- Which of the following best describes how Alexander Fleming discovered penicillin?
--   hand-rewritten: question 82->42 chars, answers 63->21 chars
UPDATE public.questions SET
    question_text = 'How did Alexander Fleming find penicillin?',
    correct_answer = 'A contaminated dish',
    incorrect_answers = '["A planned experiment", "Deliberate mould work", "It was a hoax"]'::jsonb,
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
  WHERE id = 'c712bbb6-1fc2-4e03-a443-e946410ea01f';

-- Which of the following best describes how chronic inflammation contributes to the development of chronic diseases?
--   hand-rewritten: question 114->44 chars, answers 97->21 chars
UPDATE public.questions SET
    question_text = 'How does chronic inflammation cause disease?',
    correct_answer = 'Ongoing tissue damage',
    incorrect_answers = '["It boosts immunity", "It strengthens organs", "It aids circulation"]'::jsonb,
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
  WHERE id = '88a2c44f-3af5-40ce-9944-1cb93e33558a';

-- Which of the following best describes the nature of epistemological frameworks across diverse cultures?
--   hand-rewritten: question 103->52 chars, answers 82->22 chars
UPDATE public.questions SET
    question_text = 'How do theories of knowledge differ across cultures?',
    correct_answer = 'They vary a great deal',
    incorrect_answers = '["They are identical", "One fits everyone", "Only the West has them"]'::jsonb,
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
  WHERE id = '942c8ceb-f8a9-4aef-943f-8c2fbb8437d0';

-- Which of the following concepts does Elon Musk frequently emphasize as crucial for the long-term survival of humanity?
--   hand-rewritten: question 118->54 chars, answers 73->22 chars
UPDATE public.questions SET
    question_text = 'What does Elon Musk call vital to humanity''s survival?',
    correct_answer = 'Living on many planets',
    incorrect_answers = '["Controlling rogue AI", "Self-driving transport", "Merging minds with AI"]'::jsonb,
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
  WHERE id = 'f1e8658a-db02-49f2-8eda-b10217b45ea6';

-- Which of the following groups accurately represents common narrative film structures?
--   hand-rewritten: question 85->49 chars, answers 56->36 chars
UPDATE public.questions SET
    question_text = 'Which three are common film narrative structures?',
    correct_answer = 'Three-act, hero''s journey, nonlinear',
    incorrect_answers = '["Protagonist arc, plot points, theme", "Cinematography, editing, sound", "Stop-motion, CGI, practical"]'::jsonb,
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
  WHERE id = 'fafa8541-92fa-41e7-b5bb-2c2213635dc9';

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

-- Which of the following is a common misconception about Plato's Allegory of the Cave?
--   hand-rewritten: question 84->44 chars, answers 52->21 chars
UPDATE public.questions SET
    question_text = 'What do people get wrong about Plato''s cave?',
    correct_answer = 'That it is literal',
    incorrect_answers = '["It is about reality", "Ignorance to wisdom", "Perception has limits"]'::jsonb,
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
  WHERE id = '235b2772-4200-46c8-b00d-df9191a863ed';

-- Which of the following is a common misconception about the invention of the incandescent light bulb?
--   hand-rewritten: question 100->51 chars, answers 68->21 chars
UPDATE public.questions SET
    question_text = 'What is the myth about who invented the light bulb?',
    correct_answer = 'Edison did it alone',
    incorrect_answers = '["Tesla invented it", "It began in the 1900s", "No one person did"]'::jsonb,
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
  WHERE id = '19c717f8-6977-49b0-9e16-bc32d92d7358';

-- Which of the following is a common misconception regarding the early production of the Dragon Ball manga?
--   hand-rewritten: question 105->47 chars, answers 94->22 chars
UPDATE public.questions SET
    question_text = 'What is a myth about the making of Dragon Ball?',
    correct_answer = 'Toriyama had no help',
    incorrect_answers = '["It was the first anime", "No Chinese influence", "It was an instant hit"]'::jsonb,
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
  WHERE id = 'f305d9be-8fac-40cb-b954-54a4bd44b59b';

-- Which of the following is a common pitfall in assessing emerging viral risks in public health?
--   hand-rewritten: question 94->54 chars, answers 62->23 chars
UPDATE public.questions SET
    question_text = 'What mistake is common when judging new viral threats?',
    correct_answer = 'Underrating fast spread',
    incorrect_answers = '["Trusting live data", "Rushing treatments", "Comparing genomes"]'::jsonb,
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
  WHERE id = 'cd4c2a83-43de-4eda-9cad-52c1e25d773e';

-- Which of the following is a common way Hollywood films often misrepresent the duration of surgical procedures?
--   hand-rewritten: question 110->49 chars, answers 80->23 chars
UPDATE public.questions SET
    question_text = 'How do films misrepresent how long surgery takes?',
    correct_answer = 'They show it too fast',
    incorrect_answers = '["They show it truthfully", "They dwell on waiting", "They cover recovery"]'::jsonb,
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
  WHERE id = 'de1d4ec7-99aa-4050-9acb-fe3e0c799fea';

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

-- Which of the following is a frequently depicted method used in heist films to overcome advanced security systems?
--   hand-rewritten: question 113->50 chars, answers 60->22 chars
UPDATE public.questions SET
    question_text = 'How do heist films usually beat advanced security?',
    correct_answer = 'Hacking the system',
    incorrect_answers = '["Brute-force explosives", "Social engineering", "Realistic protocols"]'::jsonb,
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
  WHERE id = '428efb97-f0cf-4d68-92de-b7fd2ad805bc';

-- Which of the following is a significant application of animal venoms in modern pharmaceutical development?
--   hand-rewritten: question 106->39 chars, answers 134->21 chars
UPDATE public.questions SET
    question_text = 'How are animal venoms used in medicine?',
    correct_answer = 'As painkiller sources',
    incorrect_answers = '["No practical use", "Too complex to make", "Ethics rule them out"]'::jsonb,
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
  WHERE id = '515187c3-8238-4791-b7b6-f7ba0ebfed27';

-- Which of the following is a widely documented long-term impact of increased automation on manufacturing employment?
--   hand-rewritten: question 115->47 chars, answers 66->24 chars
UPDATE public.questions SET
    question_text = 'What has automation done to manufacturing jobs?',
    correct_answer = 'Displaced some workers',
    incorrect_answers = '["Grew jobs overall", "Removed all humans", "Lifted everyone''s morale"]'::jsonb,
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
  WHERE id = 'c4fd4e78-a12e-456d-82e3-7c60fd6fbe29';

-- Which of the following is an unexpected negative impact of dam construction on river ecosystems?
--   hand-rewritten: question 96->42 chars, answers 70->21 chars
UPDATE public.questions SET
    question_text = 'What unexpected harm do dams do to rivers?',
    correct_answer = 'They block fish',
    incorrect_answers = '["They clean the water", "They end all floods", "They add biodiversity"]'::jsonb,
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
  WHERE id = '9209adca-2ede-4864-8e38-b20fad42b78d';

-- Which of the following is the primary way celebrity fitness routines influence the general public's exercise habits?
--   hand-rewritten: question 116->51 chars, answers 75->23 chars
UPDATE public.questions SET
    question_text = 'How do celebrity fitness routines reach the public?',
    correct_answer = 'Through social media',
    incorrect_answers = '["Through direct payment", "Through health mandates", "Through costly gear"]'::jsonb,
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
  WHERE id = 'd545fe58-d705-4e03-b41f-9c095801639e';

-- Which of the following lists represents the standard classification of vocal ranges in classical choral music?
--   hand-rewritten: question 110->47 chars, answers 49->26 chars
UPDATE public.questions SET
    question_text = 'What are the four standard choral vocal ranges?',
    correct_answer = 'Soprano, alto, tenor, bass',
    incorrect_answers = '["Mezzo, baritone, contralto", "Allegro, adagio, lento", "Staccato, legato, tremolo"]'::jsonb,
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
  WHERE id = 'c9a03ace-7264-458f-88a0-e8fd9ec11b5f';

-- Which of the following phonological features of Mandarin Chinese is crucial for distinguishing word meanings?
--   hand-rewritten: question 109->53 chars, answers 56->20 chars
UPDATE public.questions SET
    question_text = 'Which sound feature separates Mandarin word meanings?',
    correct_answer = 'Tone',
    incorrect_answers = '["No grammar at all", "Purely phonetic text", "One flat intonation"]'::jsonb,
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
  WHERE id = '4a9bd20e-8ee7-4c0d-a301-fb69f1dc4b59';

-- Which of the following represents a key parallel between Orphic and Christian cults?
--   hand-rewritten: question 84->48 chars, answers 50->24 chars
UPDATE public.questions SET
    question_text = 'What did Orphic and early Christian cults share?',
    correct_answer = 'Rebirth and shared meals',
    incorrect_answers = '["Strict monotheism", "A material afterlife", "No sacrifice at all"]'::jsonb,
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
  WHERE id = '394c2301-f000-4664-b100-7058f332ffe6';

-- Which of the following statements about Venus's rotation is a common misconception?
--   hand-rewritten: question 83->48 chars, answers 51->24 chars
UPDATE public.questions SET
    question_text = 'What do people get wrong about Venus''s rotation?',
    correct_answer = 'That it spins like Earth',
    incorrect_answers = '["It spins slower", "Its day beats its year", "It barely tilts"]'::jsonb,
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
  WHERE id = '628ac3df-1131-40bf-9519-0c6eda841b26';

-- Which of the following statements about political corruption is a common misconception or myth?
--   hand-rewritten: question 95->50 chars, answers 98->21 chars
UPDATE public.questions SET
    question_text = 'Which belief about political corruption is a myth?',
    correct_answer = 'It is only bad people',
    incorrect_answers = '["It takes many forms", "It erodes trust", "It varies by country"]'::jsonb,
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
  WHERE id = 'b5804112-e15d-472a-9323-afceec42b444';

-- Which of the following statements is famously attributed to computer scientist Donald Knuth regarding optimization?
--   hand-rewritten: question 115->49 chars, answers 58->22 chars
UPDATE public.questions SET
    question_text = 'What did Donald Knuth say about optimising early?',
    correct_answer = 'Root of all evil',
    incorrect_answers = '["Always optimise first", "Let the compiler do it", "It solves everything"]'::jsonb,
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
  WHERE id = '56282f77-914f-411a-98f6-0e32888a19f5';

-- Which of the following statements most accurately describes the global influence of Western fashion?
--   hand-rewritten: question 100->48 chars, answers 106->24 chars
UPDATE public.questions SET
    question_text = 'How far does Western fashion shape global style?',
    correct_answer = 'Strongly, but not wholly',
    incorrect_answers = '["It replaced all styles", "It is the only force", "Local styles are gone"]'::jsonb,
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
  WHERE id = '9489d8fd-263e-48b0-9a16-733187f81883';

-- Which of the following was a common early false assumption about the impact of the sharing economy on its workers?
--   hand-rewritten: question 114->57 chars, answers 102->23 chars
UPDATE public.questions SET
    question_text = 'What did people wrongly assume about gig economy workers?',
    correct_answer = 'They would earn equally',
    incorrect_answers = '["Firms would vanish", "It would stay unruled", "It would change little"]'::jsonb,
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
  WHERE id = 'a772f876-063c-449d-a326-69512371df32';

-- Which of the following was an unintended consequence of the promotion of Esperanto?
--   hand-rewritten: question 83->51 chars, answers 50->22 chars
UPDATE public.questions SET
    question_text = 'What did promoting Esperanto unintentionally cause?',
    correct_answer = 'Rival invented tongues',
    incorrect_answers = '["One global language", "National tongues died", "Fully unified speech"]'::jsonb,
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
  WHERE id = 'b0dbb61d-d290-4c95-9fcf-b2d31e1d7fff';

-- Which of these aspects of Roman religion is often misrepresented or overlooked in modern popular portrayals?
--   hand-rewritten: question 108->57 chars, answers 101->24 chars
UPDATE public.questions SET
    question_text = 'What do modern portrayals get wrong about Roman religion?',
    correct_answer = 'It was about ritual',
    incorrect_answers = '["Gods differed from Greek", "It was purely private", "Its doctrine never moved"]'::jsonb,
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
  WHERE id = '9d1e469b-74d9-4028-a9be-62571160c2ef';

-- Which of these events is specifically prophesied to occur during the onset of Ragnarök in Norse mythology?
--   hand-rewritten: question 106->44 chars, answers 49->21 chars
UPDATE public.questions SET
    question_text = 'Which event is prophesied to begin Ragnarok?',
    correct_answer = 'Fenrir breaks free',
    incorrect_answers = '["Valhalla floods", "Thor takes the throne", "Odin escapes his fate"]'::jsonb,
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
  WHERE id = 'e660b602-7eb8-4998-9347-92e78730e175';

-- Which of these famous Muhammad Ali quotes most directly expresses his self-belief and confidence?
--   hand-rewritten: question 97->51 chars, answers 68->22 chars
UPDATE public.questions SET
    question_text = 'Which Muhammad Ali line best shows his self-belief?',
    correct_answer = 'I am the greatest',
    incorrect_answers = '["Float like a butterfly", "Service is your rent", "It''s not bragging"]'::jsonb,
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
  WHERE id = '8c018548-5085-45bc-aea6-7de85e8f496d';

-- Which of these iconic dresses holds the record for being the most expensive ever sold at auction?
--   hand-rewritten: question 97->41 chars, answers 56->23 chars
UPDATE public.questions SET
    question_text = 'Which dress sold for the most at auction?',
    correct_answer = 'Monroe''s birthday dress',
    incorrect_answers = '["Diana''s wedding dress", "Hepburn''s black dress", "Kelly''s wedding dress"]'::jsonb,
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
  WHERE id = 'a7092f1a-2da1-4a9d-82e7-0aba58327a36';

-- Which of these is a common misconception regarding the symbolism of the five Olympic rings?
--   hand-rewritten: question 91->49 chars, answers 93->24 chars
UPDATE public.questions SET
    question_text = 'What do people get wrong about the Olympic rings?',
    correct_answer = 'Colours mean continents',
    incorrect_answers = '["They are founding states", "They are the ideals", "They are ancient sports"]'::jsonb,
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
  WHERE id = 'd66192d3-5e3e-404a-9a36-6605412e9384';

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

-- Which of these sports phenomena exhibits a counter-intuitive effect when the object is rotated?
--   hand-rewritten: question 95->50 chars, answers 49->17 chars
UPDATE public.questions SET
    question_text = 'Which sport shows a counter-intuitive spin effect?',
    correct_answer = 'Curling',
    incorrect_answers = '["Baseball pitching", "Tennis topspin", "Golf drives"]'::jsonb,
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
  WHERE id = 'ef7e90f5-ab10-4753-a6b1-5ca54351e86f';

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

-- Which primary mechanism do the kidneys use to regulate long-term arterial blood pressure?
--   hand-rewritten: question 89->48 chars, answers 58->22 chars
UPDATE public.questions SET
    question_text = 'How do kidneys control long-term blood pressure?',
    correct_answer = 'Salt and water balance',
    incorrect_answers = '["Raising heart rate", "Narrowing vessels", "Filtering waste"]'::jsonb,
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
  WHERE id = '1af8e593-86fb-4054-9747-ac9253aa44c5';

-- Which significant political controversy surrounded the United States' Apollo Moon landing program?
--   hand-rewritten: question 98->58 chars, answers 77->21 chars
UPDATE public.questions SET
    question_text = 'What was the main political row over the Apollo programme?',
    correct_answer = 'Its cost amid poverty',
    incorrect_answers = '["Espionage claims", "Rocket pollution", "Ex-Nazi scientists"]'::jsonb,
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
  WHERE id = 'bf39d603-11cb-421a-b467-5e7df251b366';

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

-- Which statement accurately describes a giraffe's vocalization ability?
--   hand-rewritten: question 70->25 chars, answers 64->21 chars
UPDATE public.questions SET
    question_text = 'Can giraffes make sounds?',
    correct_answer = 'Yes, but rarely',
    incorrect_answers = '["No, they are silent", "Yes, they roar loudly", "Only calves can"]'::jsonb,
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
  WHERE id = '5c1ea944-2fe9-47ff-9427-0954d8f5be4f';

-- Which statement accurately describes the current status of FDA-approved stem cell therapies?
--   hand-rewritten: question 92->51 chars, answers 80->21 chars
UPDATE public.questions SET
    question_text = 'What are FDA-approved stem cell therapies used for?',
    correct_answer = 'Blood disorders',
    incorrect_answers = '["Curing all cancers", "Nothing yet approved", "Anti-ageing cosmetics"]'::jsonb,
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
  WHERE id = 'c54fd9b0-3639-4517-bc5a-4f8d2afc7695';

-- Which statement accurately describes the presence of life in desert ecosystems?
--   hand-rewritten: question 79->33 chars, answers 84->20 chars
UPDATE public.questions SET
    question_text = 'How much life do deserts support?',
    correct_answer = 'A surprising variety',
    incorrect_answers = '["Almost none at all", "Only microbes", "Only plants"]'::jsonb,
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
  WHERE id = '6362cbfd-ef79-42db-813f-a4c7b0a987aa';

-- Which statement accurately describes the visibility of the Great Wall of China from space?
--   hand-rewritten: question 90->47 chars, answers 91->21 chars
UPDATE public.questions SET
    question_text = 'Can you see the Great Wall of China from space?',
    correct_answer = 'No, not with the eye',
    incorrect_answers = '["Yes, from the Moon", "Yes, from low orbit", "Only in clear weather"]'::jsonb,
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
  WHERE id = '97018625-5e38-4841-823e-5c3f83eb5198';

-- Which statement best characterizes Thomas Edison's primary contribution to the practical incandescent light bulb?
--   hand-rewritten: question 113->54 chars, answers 103->22 chars
UPDATE public.questions SET
    question_text = 'What was Edison''s real contribution to the light bulb?',
    correct_answer = 'A lasting filament',
    incorrect_answers = '["He invented the bulb", "He only bought patents", "He restyled the bulb"]'::jsonb,
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
  WHERE id = '837c1f1c-14ec-4fa5-ba3a-887c2e7aa39c';

-- Which statement best describes the biological classification of viruses, considering their unique characteristics?
--   hand-rewritten: question 114->35 chars, answers 93->22 chars
UPDATE public.questions SET
    question_text = 'How do biologists classify viruses?',
    correct_answer = 'Between living and not',
    incorrect_answers = '["Clearly alive", "Clearly non-living", "Depends on the host"]'::jsonb,
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
  WHERE id = '5b1c5863-2260-401c-a402-edd99810c0c5';

-- Which statement best describes the central paradox at the heart of the logical problem of evil?
--   hand-rewritten: question 95->36 chars, answers 104->22 chars
UPDATE public.questions SET
    question_text = 'What is the logical problem of evil?',
    correct_answer = 'A good God allows evil',
    incorrect_answers = '["Free will causes pain", "Angels rebelled", "Satan made all evil"]'::jsonb,
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
  WHERE id = '4541e9b7-bd8c-48af-9a6f-9cd6d4e8352e';

-- Which statement best describes the modern historical perspective on the European Middle Ages?
--   hand-rewritten: question 93->52 chars, answers 87->22 chars
UPDATE public.questions SET
    question_text = 'How do historians now view the European Middle Ages?',
    correct_answer = 'A time of progress',
    incorrect_answers = '["Total stagnation", "Science went backwards", "No innovation at all"]'::jsonb,
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
  WHERE id = '75efd69e-5a96-4ed6-b32e-3f184dad6e77';

-- Which statement best describes the primary factor contributing to Wolfgang Amadeus Mozart's early musical prowess?
--   hand-rewritten: question 114->48 chars, answers 83->22 chars
UPDATE public.questions SET
    question_text = 'What best explains Mozart''s early musical skill?',
    correct_answer = 'Intense early training',
    incorrect_answers = '["Pure innate genius", "He taught himself", "Divine inspiration"]'::jsonb,
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
  WHERE id = '34342c72-3bda-4b28-bf35-256415e3b4ee';

-- Which statement best explains why lead pipes had a limited impact on the toxicity of ancient Roman drinking water?
--   hand-rewritten: question 114->61 chars, answers 126->25 chars
UPDATE public.questions SET
    question_text = 'Why did Roman lead pipes poison the water less than expected?',
    correct_answer = 'Mineral scale coated them',
    incorrect_answers = '["Rome used copper pipes", "Acid flushed lead away", "It was a known crisis"]'::jsonb,
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
  WHERE id = '86a936b1-9de3-46f7-ab75-a040a6c56d5b';

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

-- Which three primary branches form the foundation of normative ethics?
--   hand-rewritten: question 69->43 chars, answers 52->21 chars
UPDATE public.questions SET
    question_text = 'Which three branches form normative ethics?',
    correct_answer = 'Duty, ends, virtue',
    incorrect_answers = '["Relativism, nihilism", "Religious and secular", "Meta and descriptive"]'::jsonb,
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
  WHERE id = '24bb3cc9-b552-48dd-82f7-e28b88a80849';

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

-- Which visual characteristics are most crucial for making memes instantly recognizable?
--   hand-rewritten: question 86->41 chars, answers 51->21 chars
UPDATE public.questions SET
    question_text = 'What makes a meme instantly recognisable?',
    correct_answer = 'Its type and colours',
    incorrect_answers = '["Its high resolution", "Its exact font weight", "Its pixel dimensions"]'::jsonb,
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
  WHERE id = 'e4926efd-ba53-4bdc-a04f-28aa2bd73f12';

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

-- Why can't cloning perfectly replicate personality?
--   hand-rewritten: question 50->51 chars, answers 128->21 chars
UPDATE public.questions SET
    question_text = 'Why can''t a clone share the original''s personality?',
    correct_answer = 'Environment shapes it',
    incorrect_answers = '["Genes fix it exactly", "Genes alone decide it", "Clones copy the mind"]'::jsonb,
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
  WHERE id = 'b433945d-a06f-4c25-bee9-0b7f1137c8aa';

-- Why do marathon runners carb-load before competition?
--   hand-rewritten: question 53->48 chars, answers 33->21 chars
UPDATE public.questions SET
    question_text = 'Why do marathon runners carb-load before a race?',
    correct_answer = 'To store glycogen',
    incorrect_answers = '["To grow muscle fast", "To absorb more oxygen", "To avoid dehydration"]'::jsonb,
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
  WHERE id = '791c6359-818f-49fd-b8c5-51b23cbaa70c';

-- Why do some frogs secrete toxic skin compounds?
--   hand-rewritten: answers 19->22 chars
UPDATE public.questions SET
    question_text = 'Why do some frogs secrete toxic skin compounds?',
    correct_answer = 'Defence from predators',
    incorrect_answers = '["To regulate warmth", "To attract mates", "To absorb oxygen"]'::jsonb,
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
  WHERE id = '52c95184-7100-425a-acef-cd117948aed8';

-- Why was The Beach Boys' 'Smile' album famously shelved for decades?
--   hand-rewritten: question 67->50 chars, answers 82->21 chars
UPDATE public.questions SET
    question_text = 'Why did The Beach Boys shelve ''Smile'' for decades?',
    correct_answer = 'Wilson''s health',
    incorrect_answers = '["The funding ran out", "A fire took the tapes", "A label lawsuit"]'::jsonb,
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
  WHERE id = 'b2a297b3-0f5b-4a98-9530-72f960082963';

COMMIT;

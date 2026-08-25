-- Fill the English question bank to 20 levels in every category.
--
-- 20 levels means 200 questions per language, and a category advertises the
-- level count its THINNEST language can serve. The five European languages
-- already track English exactly — every English source question has a German
-- row — and Georgian joins them as soon as the translate-questions redeploy
-- lands. So the whole multilingual gap collapses to one number per category:
-- how many NEW English questions it is short of 200.
--
-- 31 categories, 641 questions. Run once, in the Lovable SQL editor.
-- run-generation-job picks it up on its own schedule, fact-checks every item
-- before saving (a failed check drops the question rather than storing it),
-- and translate-questions fans the survivors out to the other six languages.
--
-- Not included, because this machine cannot write them:
--   the picture-guess categories — guess_movie (130), guess_city (130), guess_flag (29), guess_logo (14) —
--   303 items that are an image plus an answer, not a sentence
--   21 language-specific categories — 269 questions each in its own
--   language (Spanish literature in Spanish, German cuisine in German)

INSERT INTO public.generation_jobs (
  name, status, language, target_count, categories,
  difficulty_distribution, batch_size, interval_minutes, auto_approve,
  started_at, next_run_at
) VALUES (
  'Fill every category to 20 levels (EN)',
  'running',
  'en',
  641,
  '[{"id": "3af995ce-b0a9-4221-9964-fe738e5f2e47", "name": "მითები თუ რეალობა", "quantity": 61}, {"id": "b9a45cde-fa7a-47e4-bdd2-35b58085b95d", "name": "ანიმე და მანგა", "quantity": 41}, {"id": "730095eb-5d25-4c37-b8f2-88a880dbec27", "name": "სახალისო ფაქტები", "quantity": 33}, {"id": "fe5c3271-5e40-4c6a-828c-0854f30af501", "name": "მეცნიერება", "quantity": 32}, {"id": "331241d2-6aa9-4107-8f12-7108f3749e35", "name": "ფსიქოლოგია", "quantity": 29}, {"id": "16f4b260-ccbd-4885-abac-604115bf3b74", "name": "ბუნება", "quantity": 28}, {"id": "cf214615-056c-4b13-b047-b61be0d6a6f5", "name": "ეკოლოგია", "quantity": 28}, {"id": "b078f516-0f47-4c2b-83cd-8efc6165cc89", "name": "პოლიტიკა", "quantity": 25}, {"id": "5e0d45ac-c8bd-431d-a072-e8df2b643c8a", "name": "გეოლოგია", "quantity": 25}, {"id": "747e57c5-56b9-48bd-af27-5b2bde9dc7a4", "name": "ენები და ლინგვისტიკა", "quantity": 24}, {"id": "c384d660-dc34-4e4a-bbbc-919c0009c8c1", "name": "ეკონომიკა", "quantity": 24}, {"id": "c38e0f1f-3325-4027-be2f-dcb253985096", "name": "ცნობილი ადამიანები", "quantity": 24}, {"id": "5de491b3-b02f-4402-b1d5-f1506ac3513d", "name": "მსოფლიო სამზარეულო", "quantity": 22}, {"id": "5e49f995-e562-42fa-a452-9a38ee8efeb0", "name": "არქიტექტურა", "quantity": 22}, {"id": "d10a457a-02f9-423e-8104-df9d965663d9", "name": "ფილოსოფია", "quantity": 21}, {"id": "a21bad24-764e-4310-8355-101f7d593299", "name": "მედიცინა და ჯანმრთელობა", "quantity": 21}, {"id": "b352d1cf-a825-48a3-b85b-b916368669a3", "name": "გეოგრაფია", "quantity": 20}, {"id": "d0ac21f1-f19f-4fdb-8582-265d9c6c00ae", "name": "ხელოვნება", "quantity": 19}, {"id": "17a65a4f-22a9-4e41-b312-0990f68ff04e", "name": "ბიოლოგია", "quantity": 18}, {"id": "25442741-92ef-4d73-8ea3-071fdd20201a", "name": "სპორტი", "quantity": 17}, {"id": "54ae077e-d975-4e7d-b710-75a9b7b05d60", "name": "არქეოლოგია", "quantity": 17}, {"id": "342a8343-2671-4faa-a870-008cb2bf319e", "name": "ასტრონომია", "quantity": 16}, {"id": "9e7ed994-2920-4a9e-b25a-cc97b15cf1bd", "name": "ცხოველები", "quantity": 13}, {"id": "ad8cc9d2-06e8-4ada-865a-0b7a24a96b81", "name": "ფიზიკა", "quantity": 11}, {"id": "f86cec23-8436-47e8-be96-9f4be204ceb0", "name": "რელიგია და მითოლოგია", "quantity": 10}, {"id": "8d7a3d46-705b-43a8-8a40-d57d86615721", "name": "მოდა და სტილი", "quantity": 9}, {"id": "6713f663-9f5e-46fe-874e-d1e808abab79", "name": "კოსმოსი", "quantity": 8}, {"id": "80b2b8b6-8637-43a2-b78b-6fe502609fa1", "name": "მუსიკა", "quantity": 8}, {"id": "ba1eb6cc-c9d9-4e08-b5f5-7cb11fdfd116", "name": "ქიმია", "quantity": 7}, {"id": "83af5aca-52b1-4499-adf9-77f256ea0908", "name": "სამხედრო ისტორია", "quantity": 5}, {"id": "fd2b667e-1735-44df-b577-822aa05dfc0d", "name": "მემები და ინტერნეტი", "quantity": 3}]'::jsonb,
  '{"easy": 40, "medium": 40, "hard": 20}'::jsonb,
  10,
  3,
  true,
  now(),
  now()
);

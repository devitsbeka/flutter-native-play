-- Georgian question bank repair, batch 3 — collisions batch 2 created.
--
-- Batch 2 standardised wording: one term written four ways became one term,
-- one film title written three ways became one title. Five of those rewrites
-- collapsed a pair of questions into the same question. The duplicate
-- resolution ran before those rewrites existed, so it could not have seen
-- them; this migration retires the loser of each pair.
--
-- Nothing is deleted. Each retired row names its survivor above it.

BEGIN;

-- ვინ დაწერა „ესე იტყოდა ზარატუსტრა“?
--   the two stems were rewritten to the same text; the survivor answers with the full name, this one with the surname alone
--   survivor 06b8918f: ვინ დაწერა „ესე იტყოდა ზარატუსტრა“? -> ფრიდრიხ ნიცშე
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_ka_repair', updated_at = now() WHERE id = 'bdbbaa62-e18c-4d0b-9330-d0b35c4ba483';

-- ვინ არის გენეტიკის ფუძემდებელი?
--   the survivor's stem rewrite landed on this row's wording; the survivor answers with the full name, this one with the surname alone
--   survivor 366affe2: ვინ არის გენეტიკის ფუძემდებელი? -> გრეგორ მენდელი
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_ka_repair', updated_at = now() WHERE id = '841f1c6f-b999-4e0f-ab51-89ac4e5b2166';

-- რომელი ელემენტისგან შედგება ალმასი?
--   both stems were rewritten to the same text and both answer ნახშირბადი; the survivor is the older row
--   survivor 646b1e6b: რომელი ელემენტისგან შედგება ალმასი? -> ნახშირბადი
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_ka_repair', updated_at = now() WHERE id = '15d1709d-17f3-4072-8ac0-f677ec2e9e3a';

-- რომელი პლანეტაა ცნობილი თავისი რგოლებით?
--   the stem rewrite made this word-for-word identical to the survivor, which is the older row
--   survivor 6668b6e3: რომელი პლანეტაა ცნობილი თავისი რგოლებით? -> სატურნი
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_ka_repair', updated_at = now() WHERE id = '3e2de5ef-15d1-4b90-8c05-6760e904b3cf';

-- რა არის ხელოვნური ინტელექტის ქვედარგი?
--   the stem rewrite made these near-identical; the survivor is older and its distractors are not themselves AI subfields
--   survivor e97ae666: რომელია ხელოვნური ინტელექტის ქვედარგი? -> მანქანური სწავლება
UPDATE public.questions SET is_active = false, in_production = false, quality_status = 'retired_ka_repair', updated_at = now() WHERE id = '8a2bb0db-0594-4c87-8569-38e673245881';

COMMIT;

-- 5 questions retired.

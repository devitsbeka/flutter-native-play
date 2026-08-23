-- A brand is spelled the same way in every language.
--
-- guess_logo answers came from two places that disagreed. The v2 bank
-- transliterated into Georgian -- ეფლი, ნაიკი, ფოლკსვაგენი, 66 of its 70 --
-- and the Wikidata expansion took whatever label Wikidata held, which for
-- brands is Latin about two thirds of the time. The result is a single card
-- offering "Volkswagen AG", "Yandex", "Qatar Airways" and "ჰიულეტ-პაკარდი",
-- one option in a different alphabet from the rest.
--
-- Mixed scripts in one list of four is the visible bug, and it is only in
-- Georgian, but the same disagreement runs through the others more quietly:
-- "Université Duke", "Universität Oslo", "Keiō-Universität", "Olimpíadas".
--
-- So every language now shows the English string, which for this category is
-- not a translation choice but the correct one: a logo quiz asks what is
-- written on the mark, and the mark says Duke University. The question stem
-- stays in the player's language -- only the four options change.
--
-- The lineage does the work. Every non-English row points at its English
-- source through translated_from, so this is one join and needs no list of
-- names. Rows that already match are left alone, which makes it a no-op on
-- a second run.

BEGIN;

UPDATE public.questions q
SET correct_answer    = en.correct_answer,
    incorrect_answers = en.incorrect_answers
FROM public.questions en
JOIN public.categories c ON c.id = en.category_id
WHERE q.translated_from = en.id
  AND c.category_id = 'guess_logo'
  AND q.language <> 'en'
  AND (q.correct_answer IS DISTINCT FROM en.correct_answer
       OR q.incorrect_answers IS DISTINCT FROM en.incorrect_answers);

COMMIT;

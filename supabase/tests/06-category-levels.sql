-- How many levels a category advertises.
--
-- total_levels is questions-divided-by-ten, and the divisor is the THINNEST
-- language: a level a French player cannot fill is not a level just because
-- a Georgian one can. That rule is right for a category every language
-- shares and wrong for a category that belongs to one language by design.
--
-- საქართველოს ისტორია is Georgian, holds 194 Georgian questions -- nineteen
-- levels' worth -- and advertised ONE, because six stray questions had been
-- filed against it in six other languages, two apiece. MIN over seven groups
-- is 2; floor(2/10) is 0; clamped to 1. Six rows out of two hundred decided
-- the whole category, and the players saw a single unlocked tile with
-- "new levels coming soon" under it.
--
-- Run against the old function these assert `got 1, want 19`.
--
-- The thinnest-language rule itself is NOT relaxed here, and the second
-- assertion pins that down: a genuinely shared category is still held to its
-- worst-translated language, because that player still cannot fill the level.

\set ON_ERROR_STOP on
\pset pager off

DELETE FROM questions WHERE category_id IN (SELECT id FROM categories WHERE category_id LIKE 'test\_%');
DELETE FROM categories WHERE category_id LIKE 'test\_%';

CREATE OR REPLACE FUNCTION pg_temp.must_equal(got int, want int, label text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF got IS DISTINCT FROM want THEN
    RAISE EXCEPTION 'FAILED: % -- got %, want %', label, got, want;
  END IF;
  RAISE NOTICE 'ok: %  (%)', label, got;
END $$;

-- Reproduce საქართველოს ისტორია exactly: a Georgian-only category holding
-- 194 Georgian questions and two questions in each of six other languages.
DO $$
DECLARE cid uuid := gen_random_uuid();
BEGIN
  INSERT INTO categories (id, category_id, name, total_levels, language, is_language_specific, is_active)
  VALUES (cid, 'test_georgian_history', 'test', 1, 'ka', true, true);

  INSERT INTO questions (category_id, question_text, correct_answer, language, is_active, in_production)
  SELECT cid, 'q'||g, 'a', 'ka', true, true FROM generate_series(1,194) g;

  INSERT INTO questions (category_id, question_text, correct_answer, language, is_active, in_production)
  SELECT cid, 'q'||l||g, 'a', l, true, true
  FROM unnest(ARRAY['de','en','es','fr','it','pt']) l, generate_series(1,2) g;

  PERFORM pg_temp.must_equal(
    (SELECT total_levels FROM categories WHERE id = cid),
    19,
    '194 Georgian questions in a Georgian-only category -> 19 levels'
  );
END $$;

-- A genuinely shared category must STILL be held to its thinnest language:
-- 204 English against 4 Italian is not seventeen levels for an Italian.
DO $$
DECLARE cid uuid := gen_random_uuid();
BEGIN
  INSERT INTO categories (id, category_id, name, total_levels, language, is_language_specific, is_active)
  VALUES (cid, 'test_world_history', 'test', 1, 'ka', false, true);

  INSERT INTO questions (category_id, question_text, correct_answer, language, is_active, in_production)
  SELECT cid, 'q'||l||g, 'a', l, true, true
  FROM unnest(ARRAY['en','de','fr','es']) l, generate_series(1,204) g;

  INSERT INTO questions (category_id, question_text, correct_answer, language, is_active, in_production)
  SELECT cid, 'qit'||g, 'a', 'it', true, true FROM generate_series(1,40) g;

  PERFORM pg_temp.must_equal(
    (SELECT total_levels FROM categories WHERE id = cid),
    4,
    'shared category still capped by its thinnest language (40 Italian -> 4)'
  );
END $$;

-- A language-specific category with nothing in its own language must not
-- divide by zero or borrow another language's count.
DO $$
DECLARE cid uuid := gen_random_uuid();
BEGIN
  INSERT INTO categories (id, category_id, name, total_levels, language, is_language_specific, is_active)
  VALUES (cid, 'test_empty_specific', 'test', 5, 'ka', true, true);

  INSERT INTO questions (category_id, question_text, correct_answer, language, is_active, in_production)
  SELECT cid, 'qen'||g, 'a', 'en', true, true FROM generate_series(1,300) g;

  PERFORM pg_temp.must_equal(
    (SELECT total_levels FROM categories WHERE id = cid),
    1,
    '300 English questions do not give a Georgian-only category any levels'
  );
END $$;

-- Inactive and non-production questions are still excluded.
DO $$
DECLARE cid uuid := gen_random_uuid();
BEGIN
  INSERT INTO categories (id, category_id, name, total_levels, language, is_language_specific, is_active)
  VALUES (cid, 'test_drafts', 'test', 1, 'ka', true, true);

  INSERT INTO questions (category_id, question_text, correct_answer, language, is_active, in_production)
  SELECT cid, 'live'||g, 'a', 'ka', true, true FROM generate_series(1,50) g;
  INSERT INTO questions (category_id, question_text, correct_answer, language, is_active, in_production)
  SELECT cid, 'draft'||g, 'a', 'ka', true, false FROM generate_series(1,500) g;

  PERFORM pg_temp.must_equal(
    (SELECT total_levels FROM categories WHERE id = cid),
    5,
    'drafts do not count towards levels (50 live -> 5)'
  );
END $$;

-- The 38 ceiling still holds.
DO $$
DECLARE cid uuid := gen_random_uuid();
BEGIN
  INSERT INTO categories (id, category_id, name, total_levels, language, is_language_specific, is_active)
  VALUES (cid, 'test_huge', 'test', 1, 'ka', true, true);
  INSERT INTO questions (category_id, question_text, correct_answer, language, is_active, in_production)
  SELECT cid, 'q'||g, 'a', 'ka', true, true FROM generate_series(1,900) g;

  PERFORM pg_temp.must_equal(
    (SELECT total_levels FROM categories WHERE id = cid), 38,
    '900 questions still cap at the 38-level ceiling'
  );
END $$;

\echo 'ALL LEVEL ASSERTIONS PASSED'

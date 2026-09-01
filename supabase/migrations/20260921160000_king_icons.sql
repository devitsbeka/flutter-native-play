-- Every King question wears a fitting icon.
--
-- The duel screen was a wall of text; the owner wants each puzzle to carry
-- a hand-picked icon-library slug the way ordinary quiz questions do. The
-- column is nullable — the client falls back to a deterministic seeded icon
-- for any row without one, so future pool additions degrade gracefully.
--
-- The 24 seed puzzles get their slugs here, keyed by the English question's
-- opening words (the same LIKE-prefix trick 20260920110000 used); the
-- Georgian rows inherit through translated_from. All slugs verified against
-- the live icon_library.

ALTER TABLE public.king_questions
  ADD COLUMN IF NOT EXISTS icon_slug text;

UPDATE public.king_questions q
   SET icon_slug = m.slug
  FROM (VALUES
    ('You have two ropes%',                  'climbing-rope'),
    ('A snail climbs%',                      'snail'),
    ('Three switches%',                      'light-switch'),
    ('In a running race%',                   'running'),
    ('A father is 36%',                      'family'),
    ('You have a 5-liter jug%',              'glass-water-jug'),
    ('A farmer has 17 sheep%',               'sheep'),
    ('If 5 machines%',                       'gear'),
    ('A patch of lily pads%',                'lily'),
    ('A bat and a ball%',                    'baseball'),
    ('A man looks at a portrait%',           'picture-frame'),
    ('You have 8 identical-looking balls%',  'weight-scale'),
    ('At six o''clock a clock%',             'alarm-clock'),
    ('Two fathers and two sons%',            'apple'),
    ('How many times can you subtract%',     'calculator'),
    ('A fair coin%',                         'coin'),
    ('Five people meet%',                    'handshake'),
    ('What is the minimum number of ducks%', 'rubber-duck'),
    ('A brick weighs%',                      'brick'),
    ('On the first of January%',             'birthday-cake'),
    ('A rowing boat hangs a rope ladder%',   'rowboat'),
    ('You are given three boxes%',           'box'),
    ('A rich eccentric%',                    'camel'),
    ('A windowless room%',                   'flashlight')
  ) AS m(prefix, slug)
 WHERE q.language = 'en' AND q.question_text LIKE m.prefix AND q.icon_slug IS NULL;

UPDATE public.king_questions k
   SET icon_slug = e.icon_slug
  FROM public.king_questions e
 WHERE k.translated_from = e.id
   AND k.icon_slug IS NULL
   AND e.icon_slug IS NOT NULL;

-- king_state carries the slug to the client. Full redefinition of the
-- internal state builder (20260918100000); only the question object gained
-- icon_slug.
CREATE OR REPLACE FUNCTION public.king_state(p_match public.king_matches)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_question public.king_questions%ROWTYPE;
  v_state jsonb;
BEGIN
  v_state := jsonb_build_object(
    'match_id', p_match.id,
    'status', p_match.status,
    'player_score', p_match.player_score,
    'king_score', p_match.king_score,
    'question_number', COALESCE(array_length(p_match.question_ids, 1), 0)
                         + CASE WHEN p_match.current_question_id IS NULL THEN 0 ELSE 1 END);

  IF p_match.current_question_id IS NOT NULL THEN
    SELECT * INTO v_question FROM public.king_questions WHERE id = p_match.current_question_id;
    v_state := v_state || jsonb_build_object(
      'question', jsonb_build_object(
        'question_text', v_question.question_text,
        'image_url', v_question.image_url,
        'icon_slug', v_question.icon_slug,
        'think_deadline', p_match.drawn_at + interval '60 seconds'));
    IF p_match.options_at IS NOT NULL THEN
      v_state := v_state || jsonb_build_object(
        'options', p_match.options,
        'commit_deadline', p_match.options_at + interval '10 seconds');
    END IF;
  END IF;

  RETURN v_state;
END;
$$;

REVOKE ALL ON FUNCTION public.king_state(public.king_matches) FROM PUBLIC, anon, authenticated;

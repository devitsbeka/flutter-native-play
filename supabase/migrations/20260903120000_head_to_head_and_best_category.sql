-- What a player's profile can say about the two of you.
--
-- Two things the profile had no way to answer: how the pair of you have done
-- against each other, and what this player is actually good at.
--
-- Both are computed here rather than in the client. The head-to-head reads
-- other people's match rows and the specialty reads another user's
-- category_stats — neither is the caller's own data, so a client-side version
-- either needs those tables opened up to every signed-in reader or it returns
-- nothing at all. SECURITY DEFINER keeps the tables shut and answers the one
-- question instead, for the calling user only: the "me" side is always
-- auth.uid(), never a parameter, so this cannot be used to read the record
-- between two other people.

-- Containment lookups on player_scores drive the head-to-head; without this
-- every call is a full scan of the match history.
CREATE INDEX IF NOT EXISTS room_match_history_player_scores_idx
  ON public.room_match_history USING gin (player_scores jsonb_path_ops);

CREATE INDEX IF NOT EXISTS category_stats_user_idx
  ON public.category_stats (user_id);

/**
 * The record between the caller and one other player.
 *
 * A win is simply the higher score in a match you both played. That is the
 * same rule for a duel and for an eight-player room: placing above someone is
 * beating them, which is what a head-to-head record is understood to mean.
 * Equal scores are draws and are counted separately rather than being handed
 * to either side.
 */
CREATE OR REPLACE FUNCTION public.head_to_head_record(p_other_user_id uuid)
RETURNS TABLE (
  matches_together bigint,
  my_wins bigint,
  their_wins bigint,
  draws bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH shared AS (
    SELECT
      (SELECT (e->>'score')::numeric
         FROM jsonb_array_elements(h.player_scores) e
        WHERE e->>'user_id' = auth.uid()::text
        LIMIT 1) AS my_score,
      (SELECT (e->>'score')::numeric
         FROM jsonb_array_elements(h.player_scores) e
        WHERE e->>'user_id' = p_other_user_id::text
        LIMIT 1) AS their_score
    FROM public.room_match_history h
    WHERE auth.uid() IS NOT NULL
      AND p_other_user_id <> auth.uid()
      AND h.player_scores @> jsonb_build_array(jsonb_build_object('user_id', auth.uid()::text))
      AND h.player_scores @> jsonb_build_array(jsonb_build_object('user_id', p_other_user_id::text))
  )
  SELECT
    count(*),
    count(*) FILTER (WHERE my_score > their_score),
    count(*) FILTER (WHERE their_score > my_score),
    count(*) FILTER (WHERE my_score = their_score)
  FROM shared
  WHERE my_score IS NOT NULL AND their_score IS NOT NULL;
$$;

/**
 * What a player is best at.
 *
 * Ordered by accuracy, but only over categories they have actually answered
 * in — without the floor a single lucky question is a 100% specialty and the
 * profile would advertise whatever they happened to touch once. Ties break
 * toward the category they have answered most, so the more established one
 * wins. Returns the base (Georgian) name and the id beside it, because the
 * caller overlays category_translations for the reader's language.
 */
CREATE OR REPLACE FUNCTION public.best_category_for_user(
  p_user_id uuid,
  p_min_answers integer DEFAULT 10
)
RETURNS TABLE (
  category_id uuid,
  category_slug text,
  category_name text,
  icon_slug text,
  total_answers integer,
  correct_answers integer,
  accuracy numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.category_id, c.name, c.icon_slug,
         s.total_answers, s.correct_answers,
         round(s.correct_answers::numeric / s.total_answers, 4)
    FROM public.category_stats s
    JOIN public.categories c ON c.category_id = s.category
   WHERE s.user_id = p_user_id
     AND coalesce(s.total_answers, 0) >= greatest(p_min_answers, 1)
     AND coalesce(s.correct_answers, 0) >= 0
     AND c.is_active
   ORDER BY s.correct_answers::numeric / s.total_answers DESC,
            s.total_answers DESC
   LIMIT 1;
$$;

-- A new SECURITY DEFINER function is granted to PUBLIC by default — revoke
-- first, then grant exactly who may call it (CLAUDE.md rule 3). Both are
-- pointless to anon: head_to_head_record needs an auth.uid() to have a side,
-- and a signed-out reader has no profile page to show this on.
REVOKE ALL ON FUNCTION public.head_to_head_record(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.head_to_head_record(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.best_category_for_user(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.best_category_for_user(uuid, integer) TO authenticated, service_role;

-- The Info tab's three facts about a player, in one round trip.
--
-- Supersedes best_category_for_user, which answered only the third of them.
-- The totals come from the same rows as the specialty, so splitting them
-- across two functions meant scanning category_stats twice to fill one panel.
-- The old function stays for now: it is deployed, and dropping it would break
-- any client still in a user's browser cache mid-rollout.
--
-- SECURITY DEFINER for the same reason as before — category_stats is not the
-- caller's own data, and opening the table to every signed-in reader to fill
-- a profile panel is the wrong trade.

CREATE OR REPLACE FUNCTION public.player_profile_facts(
  p_user_id uuid,
  p_min_answers integer DEFAULT 10
)
RETURNS TABLE (
  answered bigint,
  correct bigint,
  accuracy numeric,
  best_category_id uuid,
  best_category_slug text,
  best_category_name text,
  best_icon_slug text,
  best_answered integer,
  best_accuracy numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH totals AS (
    SELECT coalesce(sum(total_answers), 0)::bigint  AS answered,
           coalesce(sum(correct_answers), 0)::bigint AS correct
      FROM public.category_stats
     WHERE user_id = p_user_id
  ),
  best AS (
    SELECT c.id, c.category_id, c.name, c.icon_slug,
           s.total_answers,
           round(s.correct_answers::numeric / s.total_answers, 4) AS acc
      FROM public.category_stats s
      JOIN public.categories c ON c.category_id = s.category
     WHERE s.user_id = p_user_id
       AND coalesce(s.total_answers, 0) >= greatest(p_min_answers, 1)
       AND c.is_active
     ORDER BY s.correct_answers::numeric / s.total_answers DESC,
              s.total_answers DESC
     LIMIT 1
  )
  SELECT t.answered,
         t.correct,
         -- Guard the divide: a player with no answers has no rate, and 0/0
         -- would abort the whole call rather than return an empty fact.
         CASE WHEN t.answered > 0
              THEN round(t.correct::numeric / t.answered, 4)
              ELSE NULL END,
         b.id, b.category_id, b.name, b.icon_slug, b.total_answers, b.acc
    FROM totals t
    LEFT JOIN best b ON true;
$$;

REVOKE ALL ON FUNCTION public.player_profile_facts(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.player_profile_facts(uuid, integer) TO authenticated, service_role;

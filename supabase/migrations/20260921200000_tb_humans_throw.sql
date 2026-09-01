-- The team's hand is the humans' hand.
--
-- tb_team_throw counted every seated member: bots got random gestures that
-- could outvote or scramble what the humans actually threw — two players
-- both picking rock read as "not a tie" server-side, and the tie-replay
-- rule (20260921190000) never fired. Now the humans on a team decide its
-- gesture (a human who never threw is still dice-filled at the deadline,
-- so nobody can stall); bots dice only for a team with no humans at all.
--
-- Full redefinition; only the membership predicate changed.

CREATE OR REPLACE FUNCTION public.tb_team_throw(p_room_id uuid, p_throws jsonb, p_team text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT gesture FROM (
    SELECT COALESCE(
             p_throws ->> rp.user_id::text,
             (ARRAY['rock', 'paper', 'scissors'])[1 + floor(random() * 3)::int]
           ) AS gesture
      FROM public.room_participants rp
     WHERE rp.room_id = p_room_id AND rp.team = p_team AND rp.status = 'playing'
       AND (NOT COALESCE(rp.is_bot, false)
            OR NOT EXISTS (
              SELECT 1 FROM public.room_participants h
               WHERE h.room_id = p_room_id AND h.team = p_team
                 AND h.status = 'playing' AND NOT COALESCE(h.is_bot, false)))
  ) g
  GROUP BY gesture
  ORDER BY count(*) DESC, random()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.tb_team_throw(uuid, jsonb, text) FROM PUBLIC, anon, authenticated;

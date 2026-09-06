-- The preset faces of two earlier eras are retired as profile pictures.
--
-- The ten drawn people (bot-avatar-N) and the eight blue Kings
-- (mascot-avatar-N) were the presets a player could pick, and they are still
-- what a share of profiles wear. The owner's ask: the eight animals instead,
-- one dealt to each player. Dealt by the player's id, so it is random across
-- players and stable for each of them — the same face on every reload.
--
-- Stored the way the studio stores an animal, `mascot:<id>`, never a bundled
-- file's URL: that URL carries the build's content hash, and the presets are
-- in this table in three forms for exactly that reason (the dev path, the
-- relative dev path, and hashed /assets/ paths from old deploys).
--
-- room_participants keeps its own copy of avatar_url, taken when the seat was
-- filled; those snapshots are refreshed from the profile so a card does not
-- keep drawing a face its owner no longer wears.

UPDATE public.profiles
   SET avatar_url = 'mascot:' || (ARRAY['owl','panda','tiger','monkey','elephant','giraffe','bull','penguin'])
                    [1 + ((('x' || left(md5(user_id::text), 7))::bit(28)::int) % 8)]
 WHERE avatar_url ~ '(bot-avatar|mascot-avatar)-[0-9]+'
   AND (avatar_url LIKE '/src/assets/%' OR avatar_url LIKE 'src/assets/%' OR avatar_url LIKE '/assets/%');

UPDATE public.room_participants rp
   SET avatar_url = p.avatar_url
  FROM public.profiles p
 WHERE p.user_id = rp.user_id
   AND rp.avatar_url IS DISTINCT FROM p.avatar_url
   AND rp.avatar_url ~ '(bot-avatar|mascot-avatar)-[0-9]+';

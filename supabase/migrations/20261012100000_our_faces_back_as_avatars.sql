-- MyTrivia's own characters go back to being the profile pictures.
--
-- 20261011100000 retired the presets and dealt every player one of the eight
-- animals instead. Seeing it, the owner's answer was the opposite: an animal
-- face cropped into a 64px circle reads as stock illustration rather than as
-- anything of MyTrivia's. The round characters are the picture again — the
-- animals go back to being what they were made for, the home screen's scene,
-- and nothing else.
--
-- So this rewrites the animals BACK. Dealt by the player's id, as the other
-- migration dealt them, so the result is random across players and stable for
-- each of them: the same face on every reload. Seven faces, not eight — the
-- blue King (mascot-avatar-1) is the home screen's own mascot, and a player
-- wearing him reads as the app's furniture.
--
-- The art these paths point at was reframed in the same release (512x512,
-- the character at 80% of it, its own background filling the rest) because
-- every placement is a circle with object-cover and crowns and hat brims were
-- being sliced off. Same filenames, so this migration needs to know nothing
-- about that.
--
-- It cannot tell an animal the last migration dealt from one a player picked
-- by hand in the window when the studio offered them. Both are rewritten:
-- the owner's instruction is that an animal is not a profile picture. A
-- player who wants a different face picks one in the studio, which is one tap
-- and is where the seven now live.
--
-- Stored as the canonical /src/assets path, which is what the profile reel
-- has always stored — never a bundled file's URL, whose build hash goes stale
-- on the next deploy.

UPDATE public.profiles
   SET avatar_url = '/src/assets/avatars/mascot-avatar-'
                    -- 2..8: face 1 is the King, who is not dealt.
                    || (2 + ((('x' || left(md5(user_id::text), 7))::bit(28)::int) % 7))::text
                    || '.png'
 WHERE avatar_url LIKE 'mascot:%';

-- room_participants keeps its own copy of avatar_url, taken when the seat was
-- filled and never refreshed. Left alone, a card would go on drawing an
-- animal for a player who is no longer wearing one.
UPDATE public.room_participants rp
   SET avatar_url = p.avatar_url
  FROM public.profiles p
 WHERE p.user_id = rp.user_id
   AND rp.avatar_url IS DISTINCT FROM p.avatar_url
   AND rp.avatar_url LIKE 'mascot:%';

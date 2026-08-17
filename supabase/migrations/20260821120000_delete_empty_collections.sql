-- Delete collections that have no rounds, and stop new ones surviving.
--
-- A round carries the collection's id, so the collection row is written
-- first and the rounds follow. Nothing made that atomic: when a round insert
-- failed, the collection stayed behind with nothing in it. Such a row still
-- publishes a card in Explore — the collection is real and public — but
-- opening it lands on "collection not found", because CollectionLobby cannot
-- tell an empty collection from a missing one.
--
-- A re-seed on 2026-08-16 between 10:45 and 10:46 UTC produced seven of them
-- in forty seconds. Six were exact-title duplicates of collections seeded on
-- 2026-02-08 that still work; the seventh was new and never had a round.
-- Every one of them was a dead card at the top of the feed, because the feed
-- sorts newest first.
--
-- CreateCollectionModal now deletes the collection when its rounds fail, so
-- this is the sweep for what already exists.

-- ── 1. The sweep ───────────────────────────────────────────────────────────
--
-- Public only. A public collection with no rounds is a card in the feed that
-- opens on "not found" — it is broken for everyone who can see it, and its
-- owner did not ask for it to exist. A private one is nobody's problem but
-- its owner's, and it is very often work in progress: the play-mode path
-- writes its collection private, and someone who abandoned a draft still owns
-- what they made. Those stay.
--
-- The one-hour floor is not decoration either. The client writes the
-- collection and then its rounds over several round trips, so a collection
-- seconds old and still empty is very likely mid-publish on somebody's phone.
-- An hour is far longer than that sequence can take and far shorter than a
-- broken row should be allowed to sit in the feed.

DELETE FROM public.quiz_collections c
WHERE c.is_public = true
  AND c.created_at < now() - interval '1 hour'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_quiz_posts p WHERE p.collection_id = c.id
  );

-- ── 2. Keep the count honest ───────────────────────────────────────────────
--
-- Emitted so the run says what it removed rather than passing silently. On a
-- database that has already been swept this reports zero, which is the point:
-- the migration is safe to re-run.

DO $$
DECLARE
  v_public  integer;
  v_private integer;
BEGIN
  SELECT
    count(*) FILTER (WHERE c.is_public),
    count(*) FILTER (WHERE NOT c.is_public)
  INTO v_public, v_private
    FROM public.quiz_collections c
   WHERE NOT EXISTS (
     SELECT 1 FROM public.user_quiz_posts p WHERE p.collection_id = c.id
   );

  RAISE NOTICE 'empty collections left — public (under the 1h floor): %, private (left alone by design): %',
    v_public, v_private;
END $$;

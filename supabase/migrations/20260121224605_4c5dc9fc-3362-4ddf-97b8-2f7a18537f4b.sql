-- Fix tv_session_queue.category_id type mismatch
-- The column is currently uuid but category IDs in game_rooms and room_category_queue are text slugs
-- This causes silent insert failures when seeding the queue

ALTER TABLE tv_session_queue 
ALTER COLUMN category_id TYPE text 
USING category_id::text;
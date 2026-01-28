-- Add host_is_observer column to game_rooms table
-- This tracks when the host is in observer mode (can't answer, but earns points from mistakes)
ALTER TABLE game_rooms 
ADD COLUMN host_is_observer BOOLEAN DEFAULT FALSE;
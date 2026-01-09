-- Add background_gradient column to game_rooms
ALTER TABLE game_rooms 
ADD COLUMN background_gradient text DEFAULT 'lavender_mist';
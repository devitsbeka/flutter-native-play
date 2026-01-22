-- Add user_trivia_id column to game_rooms to track when a user trivia is the room's initial category
ALTER TABLE game_rooms 
ADD COLUMN user_trivia_id UUID REFERENCES user_quiz_posts(id) ON DELETE SET NULL;
-- Phase 2: Add shuffled_answers column to room_questions
ALTER TABLE room_questions 
ADD COLUMN IF NOT EXISTS shuffled_answers TEXT[] DEFAULT '{}';

-- Phase 4: Add used_question_ids column to game_rooms
ALTER TABLE game_rooms 
ADD COLUMN IF NOT EXISTS used_question_ids UUID[] DEFAULT '{}';
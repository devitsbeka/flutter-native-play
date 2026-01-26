-- Drop old constraint that doesn't include tv_session_id
ALTER TABLE player_answers 
DROP CONSTRAINT IF EXISTS player_answers_room_id_user_id_question_index_key;

-- Create new constraint including tv_session_id for proper session isolation
ALTER TABLE player_answers 
ADD CONSTRAINT player_answers_session_user_question_unique 
UNIQUE (tv_session_id, user_id, question_index);
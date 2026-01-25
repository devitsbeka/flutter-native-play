-- Update the tv_sessions_status_check constraint to include 'poll-results'
ALTER TABLE tv_sessions DROP CONSTRAINT IF EXISTS tv_sessions_status_check;
ALTER TABLE tv_sessions ADD CONSTRAINT tv_sessions_status_check 
CHECK (status IN (
  'waiting', 'paired', 'lobby', 'category-select', 'countdown', 
  'question', 'playing', 'reveal', 'round-intro', 'poll-suggest', 
  'poll-voting', 'poll-results', 'results', 'completed'
));
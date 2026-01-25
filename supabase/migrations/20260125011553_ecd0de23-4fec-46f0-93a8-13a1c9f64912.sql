-- Update tv_sessions status constraint to include 'category-select' phase
ALTER TABLE tv_sessions DROP CONSTRAINT IF EXISTS tv_sessions_status_check;

ALTER TABLE tv_sessions ADD CONSTRAINT tv_sessions_status_check 
CHECK (status IN (
  'waiting', 'paired', 'lobby', 'category-select', 'countdown', 
  'question', 'playing', 'reveal', 'round-intro', 'poll-suggest', 
  'poll-voting', 'results', 'completed'
));
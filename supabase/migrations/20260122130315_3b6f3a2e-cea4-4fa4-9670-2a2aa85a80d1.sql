-- tv_sessions.status check constraint currently blocks 'round-intro' (and other app statuses)
-- Recreate constraint with all statuses used by the TV flow.
ALTER TABLE public.tv_sessions
  DROP CONSTRAINT IF EXISTS tv_sessions_status_check;

ALTER TABLE public.tv_sessions
  ADD CONSTRAINT tv_sessions_status_check
  CHECK (status IS NULL OR status IN (
    'waiting',
    'paired',
    'lobby',
    'countdown',
    'question',
    'playing',
    'reveal',
    'round-intro',
    'results',
    'completed',
    'idle',
    'pairing'
  ));

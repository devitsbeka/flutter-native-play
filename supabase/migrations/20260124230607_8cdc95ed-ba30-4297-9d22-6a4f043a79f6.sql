-- Add poll-related statuses to tv_sessions
-- First, drop and recreate the constraint to include new statuses
ALTER TABLE public.tv_sessions DROP CONSTRAINT IF EXISTS tv_sessions_status_check;
ALTER TABLE public.tv_sessions ADD CONSTRAINT tv_sessions_status_check 
  CHECK (status IN ('waiting', 'paired', 'lobby', 'countdown', 'question', 'playing', 'reveal', 'round-intro', 'results', 'completed', 'poll-suggest', 'poll-voting'));

-- Add poll-related columns to tv_sessions
ALTER TABLE public.tv_sessions 
  ADD COLUMN IF NOT EXISTS poll_start_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS poll_duration INTEGER DEFAULT 30;

-- Table: tv_poll_suggestions - stores category suggestions for voting
CREATE TABLE IF NOT EXISTS public.tv_poll_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES tv_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  nickname TEXT NOT NULL,
  avatar_url TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('category', 'trivia', 'collection')),
  category_id TEXT,
  user_trivia_id UUID,
  category_name TEXT NOT NULL,
  icon_slug TEXT,
  cover_image TEXT,
  vote_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: tv_poll_votes - tracks individual votes
CREATE TABLE IF NOT EXISTS public.tv_poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES tv_sessions(id) ON DELETE CASCADE,
  suggestion_id UUID NOT NULL REFERENCES tv_poll_suggestions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (suggestion_id, user_id)
);

-- Enable RLS
ALTER TABLE public.tv_poll_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tv_poll_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tv_poll_suggestions
CREATE POLICY "Anyone can view poll suggestions for active sessions"
ON public.tv_poll_suggestions
FOR SELECT
USING (true);

CREATE POLICY "Players can insert their own suggestions"
ON public.tv_poll_suggestions
FOR INSERT
WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Players can delete their own suggestions"
ON public.tv_poll_suggestions
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can update vote count"
ON public.tv_poll_suggestions
FOR UPDATE
USING (true);

-- RLS Policies for tv_poll_votes
CREATE POLICY "Anyone can view poll votes"
ON public.tv_poll_votes
FOR SELECT
USING (true);

CREATE POLICY "Players can insert votes"
ON public.tv_poll_votes
FOR INSERT
WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Players can delete their own votes"
ON public.tv_poll_votes
FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.tv_poll_suggestions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tv_poll_votes;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tv_poll_suggestions_session ON public.tv_poll_suggestions(session_id);
CREATE INDEX IF NOT EXISTS idx_tv_poll_votes_session ON public.tv_poll_votes(session_id);
CREATE INDEX IF NOT EXISTS idx_tv_poll_votes_suggestion ON public.tv_poll_votes(suggestion_id);

-- Function to update vote count on suggestion when votes change
CREATE OR REPLACE FUNCTION public.update_suggestion_vote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tv_poll_suggestions 
    SET vote_count = vote_count + 1 
    WHERE id = NEW.suggestion_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tv_poll_suggestions 
    SET vote_count = GREATEST(0, vote_count - 1) 
    WHERE id = OLD.suggestion_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for vote count updates
DROP TRIGGER IF EXISTS update_vote_count_trigger ON public.tv_poll_votes;
CREATE TRIGGER update_vote_count_trigger
AFTER INSERT OR DELETE ON public.tv_poll_votes
FOR EACH ROW
EXECUTE FUNCTION public.update_suggestion_vote_count();
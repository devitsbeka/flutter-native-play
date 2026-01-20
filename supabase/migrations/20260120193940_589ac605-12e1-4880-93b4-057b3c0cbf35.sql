-- Add reveal timestamp for synchronized reveal -> next question transitions
ALTER TABLE public.tv_sessions
ADD COLUMN IF NOT EXISTS reveal_start_time TIMESTAMP WITH TIME ZONE;

-- Queue of upcoming rounds for TV sessions (multi-round support)
CREATE TABLE IF NOT EXISTS public.tv_session_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  position INTEGER NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'category',
  category_id UUID NULL,
  category_name TEXT NULL,
  icon_slug TEXT NULL,
  user_trivia_id UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- FK + indexes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema='public'
      AND table_name='tv_session_queue'
      AND constraint_name='tv_session_queue_session_id_fkey'
  ) THEN
    ALTER TABLE public.tv_session_queue
      ADD CONSTRAINT tv_session_queue_session_id_fkey
      FOREIGN KEY (session_id) REFERENCES public.tv_sessions(id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tv_session_queue_session_pos
  ON public.tv_session_queue(session_id, position);

-- RLS
ALTER TABLE public.tv_session_queue ENABLE ROW LEVEL SECURITY;

-- Anyone involved can read the queue (TV display + guests)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='tv_session_queue' AND policyname='TV queue is readable by everyone'
  ) THEN
    CREATE POLICY "TV queue is readable by everyone"
    ON public.tv_session_queue
    FOR SELECT
    USING (true);
  END IF;
END $$;

-- Only the authenticated host of the session can mutate the queue
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='tv_session_queue' AND policyname='Host can add to own TV queue'
  ) THEN
    CREATE POLICY "Host can add to own TV queue"
    ON public.tv_session_queue
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.tv_sessions s
        WHERE s.id = tv_session_queue.session_id
          AND s.host_user_id = auth.uid()
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='tv_session_queue' AND policyname='Host can update own TV queue'
  ) THEN
    CREATE POLICY "Host can update own TV queue"
    ON public.tv_session_queue
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.tv_sessions s
        WHERE s.id = tv_session_queue.session_id
          AND s.host_user_id = auth.uid()
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='tv_session_queue' AND policyname='Host can delete from own TV queue'
  ) THEN
    CREATE POLICY "Host can delete from own TV queue"
    ON public.tv_session_queue
    FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM public.tv_sessions s
        WHERE s.id = tv_session_queue.session_id
          AND s.host_user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tv_session_queue;
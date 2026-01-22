-- Drop existing policies for tv_session_queue
DROP POLICY IF EXISTS "Host can add to own TV queue" ON public.tv_session_queue;
DROP POLICY IF EXISTS "Host can delete from own TV queue" ON public.tv_session_queue;
DROP POLICY IF EXISTS "Host can update own TV queue" ON public.tv_session_queue;

-- Create new policies that allow both the TV host AND linked room host to manage the queue
-- Allow insert if user is either the TV session host OR the host of the linked game room
CREATE POLICY "TV or room host can add to queue"
ON public.tv_session_queue
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tv_sessions s
    LEFT JOIN game_rooms gr ON gr.tv_session_id = s.id
    WHERE s.id = tv_session_queue.session_id
    AND (
      s.host_user_id = auth.uid()
      OR gr.host_user_id = auth.uid()
    )
  )
);

-- Allow delete if user is either the TV session host OR the host of the linked game room
CREATE POLICY "TV or room host can delete from queue"
ON public.tv_session_queue
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM tv_sessions s
    LEFT JOIN game_rooms gr ON gr.tv_session_id = s.id
    WHERE s.id = tv_session_queue.session_id
    AND (
      s.host_user_id = auth.uid()
      OR gr.host_user_id = auth.uid()
    )
  )
);

-- Allow update if user is either the TV session host OR the host of the linked game room
CREATE POLICY "TV or room host can update queue"
ON public.tv_session_queue
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM tv_sessions s
    LEFT JOIN game_rooms gr ON gr.tv_session_id = s.id
    WHERE s.id = tv_session_queue.session_id
    AND (
      s.host_user_id = auth.uid()
      OR gr.host_user_id = auth.uid()
    )
  )
);
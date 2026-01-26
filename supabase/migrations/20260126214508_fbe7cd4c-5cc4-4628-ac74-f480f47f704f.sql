-- Enable REPLICA IDENTITY FULL for tv_poll_suggestions to ensure all fields are sent on DELETE
ALTER TABLE public.tv_poll_suggestions REPLICA IDENTITY FULL;

-- Enable REPLICA IDENTITY FULL for tv_poll_votes as well
ALTER TABLE public.tv_poll_votes REPLICA IDENTITY FULL;
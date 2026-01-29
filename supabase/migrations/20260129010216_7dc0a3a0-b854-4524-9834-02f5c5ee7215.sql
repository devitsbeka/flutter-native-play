-- Create trigger to notify users when they receive a friend request (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_friend_request_created'
  ) THEN
    CREATE TRIGGER on_friend_request_created
      AFTER INSERT ON public.friendships
      FOR EACH ROW
      EXECUTE FUNCTION public.notify_friend_request();
  END IF;
END
$$;
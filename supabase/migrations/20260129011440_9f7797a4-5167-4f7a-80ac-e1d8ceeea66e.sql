-- Remove duplicate triggers - keep only one
DROP TRIGGER IF EXISTS on_friendship_created ON public.friendships;
DROP TRIGGER IF EXISTS on_friend_request_sent ON public.friendships;

-- Keep only on_friend_request_created (or recreate it properly)
DROP TRIGGER IF EXISTS on_friend_request_created ON public.friendships;

-- Create single trigger for friend requests
CREATE TRIGGER on_friend_request_created
  AFTER INSERT ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_friend_request();
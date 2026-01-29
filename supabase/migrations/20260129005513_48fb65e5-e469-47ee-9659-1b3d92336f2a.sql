-- Create trigger to notify users when they receive a friend request
CREATE TRIGGER on_friendship_created
  AFTER INSERT ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_friend_request();
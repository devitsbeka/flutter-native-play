-- Enable realtime for profiles table to broadcast avatar updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
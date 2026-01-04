-- Set REPLICA IDENTITY FULL to ensure complete row data is captured during updates
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
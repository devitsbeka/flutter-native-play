-- Update the handle_new_user function to use name/full_name from OAuth providers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nickname, avatar_url)
  VALUES (
    new.id, 
    COALESCE(
      new.raw_user_meta_data ->> 'nickname',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      'Player' || floor(random() * 10000)::text
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN new;
END;
$$;
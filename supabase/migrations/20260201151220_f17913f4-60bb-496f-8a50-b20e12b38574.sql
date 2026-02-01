-- Create a helper function to format full names as "FirstName L."
CREATE OR REPLACE FUNCTION public.format_display_name(full_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  parts text[];
  first_name text;
  last_initial text;
BEGIN
  IF full_name IS NULL OR trim(full_name) = '' THEN
    RETURN NULL;
  END IF;
  
  -- Split by space and get parts
  parts := string_to_array(trim(full_name), ' ');
  
  -- Get first name (capitalize first letter)
  first_name := initcap(parts[1]);
  
  -- If there's a last name, get its first letter
  IF array_length(parts, 1) > 1 THEN
    last_initial := upper(left(parts[array_length(parts, 1)], 1)) || '.';
    RETURN first_name || ' ' || last_initial;
  ELSE
    RETURN first_name;
  END IF;
END;
$$;

-- Update handle_new_user to use the formatted name
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
      public.format_display_name(new.raw_user_meta_data ->> 'full_name'),
      public.format_display_name(new.raw_user_meta_data ->> 'name'),
      'Player' || floor(random() * 10000)::text
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN new;
END;
$$;
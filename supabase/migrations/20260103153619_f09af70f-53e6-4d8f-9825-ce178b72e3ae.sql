-- Send welcome notification to all existing users
INSERT INTO public.notifications (user_id, type, title, message, data)
SELECT 
  p.user_id,
  'system',
  'მოგესალმებით MyTrivia-ში! 🎉',
  'გამარჯობა! კეთილი იყოს შენი მობრძანება ჩვენს თამაშში. გისურვებთ წარმატებებს!',
  '{"icon_slug": "party-popper"}'::jsonb
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.notifications n 
  WHERE n.user_id = p.user_id 
  AND n.type = 'system' 
  AND n.title LIKE '%MyTrivia%'
);
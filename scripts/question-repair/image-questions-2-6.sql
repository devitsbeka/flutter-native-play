INSERT INTO public.questions (language,category_id,question_text,correct_answer,incorrect_answers,image_url,difficulty,level_number,is_active,in_production)
SELECT * FROM (VALUES
  ('en','25442741-92ef-4d73-8ea3-071fdd20201a'::uuid,'Which sport is shown?','Curling','["Bocce", "Shuffleboard", "Petanque"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/f/f5/Curling%2C_overall_view_of_the_Tim_Hortons_Brier_venue_-_Edmonton%2C_Canada.jpg','medium',1,true,false),
  ('en','25442741-92ef-4d73-8ea3-071fdd20201a'::uuid,'Which sport is shown?','Sumo','["Judo", "Wrestling", "Aikido"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Asashoryu_fight_Jan08.JPG/960px-Asashoryu_fight_Jan08.JPG','medium',1,true,false),
  ('en','25442741-92ef-4d73-8ea3-071fdd20201a'::uuid,'Which sport is shown?','Badminton','["Squash", "Table tennis", "Padel"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Olympics_2012_Mixed_Doubles_Final.jpg/960px-Olympics_2012_Mixed_Doubles_Final.jpg','medium',1,true,false),
  ('en','25442741-92ef-4d73-8ea3-071fdd20201a'::uuid,'Which stadium is shown?','Wembley','["Old Trafford", "Anfield", "Emirates"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/London_Wembley.jpg/960px-London_Wembley.jpg','medium',1,true,false),
  ('en','5de491b3-b02f-4402-b1d5-f1506ac3513d'::uuid,'Which dish is shown?','Sushi','["Sashimi", "Poke", "Ceviche"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Sushi_platter.jpg/960px-Sushi_platter.jpg','easy',1,true,false),
  ('en','5de491b3-b02f-4402-b1d5-f1506ac3513d'::uuid,'Which dish is shown?','Paella','["Risotto", "Jambalaya", "Biryani"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/01_Paella_Valenciana_original.jpg/960px-01_Paella_Valenciana_original.jpg','medium',1,true,false),
  ('en','5de491b3-b02f-4402-b1d5-f1506ac3513d'::uuid,'Which dish is shown?','Pho','["Ramen", "Laksa", "Udon"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Bowl_of_Meatball_pho.jpg/960px-Bowl_of_Meatball_pho.jpg','medium',1,true,false),
  ('en','5de491b3-b02f-4402-b1d5-f1506ac3513d'::uuid,'Which dish is shown?','Ramen','["Pho", "Udon", "Soba"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Shoyu_Ramen%EF%BC%88Tokyo_Ramen%EF%BC%89_-_01.jpg/960px-Shoyu_Ramen%EF%BC%88Tokyo_Ramen%EF%BC%89_-_01.jpg','easy',1,true,false),
  ('en','5de491b3-b02f-4402-b1d5-f1506ac3513d'::uuid,'Which dish is shown?','Taco','["Burrito", "Quesadilla", "Empanada"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/001_Tacos_de_carnitas%2C_carne_asada_y_al_pastor.jpg/960px-001_Tacos_de_carnitas%2C_carne_asada_y_al_pastor.jpg','easy',1,true,false),
  ('en','5de491b3-b02f-4402-b1d5-f1506ac3513d'::uuid,'Which pastry is shown?','Croissant','["Brioche", "Danish", "Palmier"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Croissant-Petr_Kratochvil.jpg/960px-Croissant-Petr_Kratochvil.jpg','easy',1,true,false)
) AS v(language,category_id,question_text,correct_answer,incorrect_answers,image_url,difficulty,level_number,is_active,in_production)
WHERE NOT EXISTS (
  SELECT 1 FROM public.questions p
   WHERE p.image_url = v.image_url AND p.language = 'en'
);

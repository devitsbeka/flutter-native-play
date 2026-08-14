INSERT INTO public.questions (language,category_id,question_text,correct_answer,incorrect_answers,image_url,difficulty,level_number,is_active,in_production)
SELECT * FROM (VALUES
  ('en','5de491b3-b02f-4402-b1d5-f1506ac3513d'::uuid,'Which dessert is shown?','Baklava','["Kunafa", "Strudel", "Halva"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/c/c7/Baklava%281%29.png','medium',1,true,false),
  ('en','5de491b3-b02f-4402-b1d5-f1506ac3513d'::uuid,'Which soup is shown?','Borscht','["Gazpacho", "Minestrone", "Goulash"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Borscht_served.jpg/960px-Borscht_served.jpg','medium',1,true,false),
  ('en','5de491b3-b02f-4402-b1d5-f1506ac3513d'::uuid,'Which food is shown?','Falafel','["Kofta", "Croquette", "Arancini"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Falafels_2.jpg/960px-Falafels_2.jpg','medium',1,true,false),
  ('en','5de491b3-b02f-4402-b1d5-f1506ac3513d'::uuid,'Which dish is shown?','Poutine','["Chili fries", "Nachos", "Loaded fries"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Food_at_WIkimanian_2017_02.jpg/960px-Food_at_WIkimanian_2017_02.jpg','medium',1,true,false),
  ('en','5de491b3-b02f-4402-b1d5-f1506ac3513d'::uuid,'Which dish is shown?','Pierogi','["Ravioli", "Gyoza", "Momo"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Pierogi_z_mas%C5%82em_-_2023.03.31.jpg/960px-Pierogi_z_mas%C5%82em_-_2023.03.31.jpg','medium',1,true,false),
  ('en','5de491b3-b02f-4402-b1d5-f1506ac3513d'::uuid,'Which food is shown?','Kimchi','["Sauerkraut", "Pickles", "Tsukemono"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Kimchi_at_restaurant_Korean_Kitchen.jpg/960px-Kimchi_at_restaurant_Korean_Kitchen.jpg','medium',1,true,false),
  ('en','5de491b3-b02f-4402-b1d5-f1506ac3513d'::uuid,'Which dessert is shown?','Macaron','["Macaroon", "Meringue", "Whoopie pie"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/VanillaMacaron.jpg/960px-VanillaMacaron.jpg','easy',1,true,false),
  ('en','0ab371b2-85c5-4016-b14e-8e352caa6e6d'::uuid,'Which artefact is shown?','Rosetta Stone','["Code of Hammurabi", "Cyrus Cylinder", "Behistun relief"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Rosetta_Stone.JPG/960px-Rosetta_Stone.JPG','medium',1,true,false),
  ('en','0ab371b2-85c5-4016-b14e-8e352caa6e6d'::uuid,'What is shown?','Terracotta Army','["Moai", "Nok sculptures", "Ashoka pillars"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/51714-Terracota-Army.jpg/960px-51714-Terracota-Army.jpg','easy',1,true,false),
  ('en','0ab371b2-85c5-4016-b14e-8e352caa6e6d'::uuid,'Which artefact is shown?','Tutankhamun''s mask','["Mask of Agamemnon", "Nefertiti bust", "Sarcophagus of Seti"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/CairoEgMuseumTaaMaskMostlyPhotographed.jpg/960px-CairoEgMuseumTaaMaskMostlyPhotographed.jpg','easy',1,true,false)
) AS v(language,category_id,question_text,correct_answer,incorrect_answers,image_url,difficulty,level_number,is_active,in_production)
WHERE NOT EXISTS (
  SELECT 1 FROM public.questions p
   WHERE p.image_url = v.image_url AND p.language = 'en'
);

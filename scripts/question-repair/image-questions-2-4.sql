INSERT INTO public.questions (language,category_id,question_text,correct_answer,incorrect_answers,image_url,difficulty,level_number,is_active,in_production)
SELECT * FROM (VALUES
  ('en','a4e83e6a-93dd-450a-b7ed-00c10278089e'::uuid,'Which console is shown?','PlayStation 2','["Xbox", "GameCube", "Dreamcast"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/PS2-Versions.png/960px-PS2-Versions.png','easy',1,true,false),
  ('en','a4e83e6a-93dd-450a-b7ed-00c10278089e'::uuid,'Which console is shown?','Nintendo 64','["Saturn", "Jaguar", "3DO"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Nintendo-64-wController-L.jpg/960px-Nintendo-64-wController-L.jpg','easy',1,true,false),
  ('en','a4e83e6a-93dd-450a-b7ed-00c10278089e'::uuid,'Which console is shown?','Dreamcast','["Saturn", "PlayStation", "Nintendo 64"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Dreamcast-Console-Set.jpg/960px-Dreamcast-Console-Set.jpg','medium',1,true,false),
  ('en','a4e83e6a-93dd-450a-b7ed-00c10278089e'::uuid,'Which console is shown?','Atari 2600','["Intellivision", "Odyssey 2", "Vectrex"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Atari-2600-Wood-4Sw-Set.png/960px-Atari-2600-Wood-4Sw-Set.png','medium',1,true,false),
  ('en','a4e83e6a-93dd-450a-b7ed-00c10278089e'::uuid,'Which puzzle is shown?','Rubik''s Cube','["Pyraminx", "Megaminx", "Soma cube"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/6/61/Rubiks_cube_solved.jpg','medium',1,true,false),
  ('en','6713f663-9f5e-46fe-874e-d1e808abab79'::uuid,'Which planet is shown?','Saturn','["Uranus", "Neptune", "Jupiter"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Saturn_global_view_from_Cassini%2C_rings_open_Better_Colour.png/960px-Saturn_global_view_from_Cassini%2C_rings_open_Better_Colour.png','easy',1,true,false),
  ('en','6713f663-9f5e-46fe-874e-d1e808abab79'::uuid,'Which planet is shown?','Jupiter','["Saturn", "Venus", "Neptune"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Jupiter_OPAL_2024.png/960px-Jupiter_OPAL_2024.png','easy',1,true,false),
  ('en','6713f663-9f5e-46fe-874e-d1e808abab79'::uuid,'Which planet is shown?','Mars','["Mercury", "Venus", "Ceres"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Mars_-_August_30_2021_-_Flickr_-_Kevin_M._Gill.png/960px-Mars_-_August_30_2021_-_Flickr_-_Kevin_M._Gill.png','easy',1,true,false),
  ('en','6713f663-9f5e-46fe-874e-d1e808abab79'::uuid,'Which planet is shown?','Neptune','["Uranus", "Earth", "Jupiter"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Neptune_Voyager2_color_calibrated.png/960px-Neptune_Voyager2_color_calibrated.png','medium',1,true,false),
  ('en','6713f663-9f5e-46fe-874e-d1e808abab79'::uuid,'Which spacecraft is shown?','Hubble','["James Webb", "Kepler", "Chandra"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Hubble_2009_close-up_2.jpg/960px-Hubble_2009_close-up_2.jpg','medium',1,true,false)
) AS v(language,category_id,question_text,correct_answer,incorrect_answers,image_url,difficulty,level_number,is_active,in_production)
WHERE NOT EXISTS (
  SELECT 1 FROM public.questions p
   WHERE p.image_url = v.image_url AND p.language = 'en'
);

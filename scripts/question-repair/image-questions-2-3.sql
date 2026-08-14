INSERT INTO public.questions (language,category_id,question_text,correct_answer,incorrect_answers,image_url,difficulty,level_number,is_active,in_production)
SELECT * FROM (VALUES
  ('en','80b2b8b6-8637-43a2-b78b-6fe502609fa1'::uuid,'Which instrument is shown?','Accordion','["Concertina", "Bandoneon", "Harmonium"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/A_converter_free-bass_piano-accordion_and_a_Russian_bayan.jpg/960px-A_converter_free-bass_piano-accordion_and_a_Russian_bayan.jpg','medium',1,true,false),
  ('en','80b2b8b6-8637-43a2-b78b-6fe502609fa1'::uuid,'Which instrument is shown?','Bagpipes','["Hurdy-gurdy", "Shawm", "Uilleann pipes"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/f/f4/HighlandersPiperMajor.jpg','medium',1,true,false),
  ('en','80b2b8b6-8637-43a2-b78b-6fe502609fa1'::uuid,'Which instrument is shown?','Theremin','["Ondes Martenot", "Mellotron", "Clavioline"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Etherwave_Theremin_Kit.jpg/960px-Etherwave_Theremin_Kit.jpg','medium',1,true,false),
  ('en','80b2b8b6-8637-43a2-b78b-6fe502609fa1'::uuid,'Which instrument is shown?','Trombone','["Trumpet", "French horn", "Tuba"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Yamaha_Tenor_trombone_YSL-891Z_%28re-crop%29.jpg/960px-Yamaha_Tenor_trombone_YSL-891Z_%28re-crop%29.jpg','easy',1,true,false),
  ('en','80b2b8b6-8637-43a2-b78b-6fe502609fa1'::uuid,'Who is shown?','Bob Dylan','["Leonard Cohen", "Neil Young", "Tom Waits"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/DylanYoungKilkenny140719v2_%2850_of_52%29_%2852246124397%29_%28cropped%29.jpg/960px-DylanYoungKilkenny140719v2_%2850_of_52%29_%2852246124397%29_%28cropped%29.jpg','medium',1,true,false),
  ('en','80b2b8b6-8637-43a2-b78b-6fe502609fa1'::uuid,'Who is shown?','Elton John','["Billy Joel", "Rod Stewart", "Barry Manilow"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/6/61/EltonDocBFILFF101024_%284_of_17%29_%28cropped%29.jpg','easy',1,true,false),
  ('en','80b2b8b6-8637-43a2-b78b-6fe502609fa1'::uuid,'Who is shown?','Dolly Parton','["Reba McEntire", "Loretta Lynn", "Tammy Wynette"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/e/eb/Dolly_Parton_in_2022.jpg','medium',1,true,false),
  ('en','80b2b8b6-8637-43a2-b78b-6fe502609fa1'::uuid,'Who is shown?','Snoop Dogg','["Dr. Dre", "Ice Cube", "Nas"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/f/f0/Snoop_Dogg%2C_WrestleMania_XL_%28cropped%29_%28cropped%29.jpg','easy',1,true,false),
  ('en','a4e83e6a-93dd-450a-b7ed-00c10278089e'::uuid,'Which console is shown?','NES','["Atari 7800", "Master System", "ColecoVision"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/NES-Console-Set.png/960px-NES-Console-Set.png','easy',1,true,false),
  ('en','a4e83e6a-93dd-450a-b7ed-00c10278089e'::uuid,'Which handheld is shown?','Game Boy','["Game Gear", "Lynx", "Neo Geo Pocket"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Game-Boy-FL.png/960px-Game-Boy-FL.png','easy',1,true,false)
) AS v(language,category_id,question_text,correct_answer,incorrect_answers,image_url,difficulty,level_number,is_active,in_production)
WHERE NOT EXISTS (
  SELECT 1 FROM public.questions p
   WHERE p.image_url = v.image_url AND p.language = 'en'
);

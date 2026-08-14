INSERT INTO public.questions (language,category_id,question_text,correct_answer,incorrect_answers,image_url,difficulty,level_number,is_active,in_production)
SELECT * FROM (VALUES
  ('en','16f4b260-ccbd-4885-abac-604115bf3b74'::uuid,'What is shown?','Aurora','["Airglow", "Zodiacal light", "Noctilucent cloud"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Aurora_borealis_over_Eielson_Air_Force_Base%2C_Alaska.jpg/960px-Aurora_borealis_over_Eielson_Air_Force_Base%2C_Alaska.jpg','easy',1,true,false),
  ('en','16f4b260-ccbd-4885-abac-604115bf3b74'::uuid,'What is shown?','Cherry blossom','["Plum blossom", "Magnolia", "Apple blossom"]'::jsonb,'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Sakura_and_Moss_Pink_-_%E6%A1%9C%28%E3%81%95%E3%81%8F%E3%82%89%29%E3%81%A8%E8%8A%9D%E6%A1%9C%28%E3%81%97%E3%81%B0%E3%81%96%E3%81%8F%E3%82%89%29.jpg/960px-Sakura_and_Moss_Pink_-_%E6%A1%9C%28%E3%81%95%E3%81%8F%E3%82%89%29%E3%81%A8%E8%8A%9D%E6%A1%9C%28%E3%81%97%E3%81%B0%E3%81%96%E3%81%8F%E3%82%89%29.jpg','easy',1,true,false)
) AS v(language,category_id,question_text,correct_answer,incorrect_answers,image_url,difficulty,level_number,is_active,in_production)
WHERE NOT EXISTS (
  SELECT 1 FROM public.questions p
   WHERE p.image_url = v.image_url AND p.language = 'en'
);

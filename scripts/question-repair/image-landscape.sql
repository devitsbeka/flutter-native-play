-- Two landmark photos swapped for landscape shots of the same subject.
UPDATE public.questions AS t
   SET image_url = v.new
  FROM (VALUES
    ('https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Tour_Eiffel_Wikimedia_Commons_%28cropped%29.jpg/960px-Tour_Eiffel_Wikimedia_Commons_%28cropped%29.jpg', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Eiffel_Tower_as_seen_from_Trocadero.jpg/960px-Eiffel_Tower_as_seen_from_Trocadero.jpg'),
    ('https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Christ_the_Redeemer_-_Cristo_Redentor.jpg/960px-Christ_the_Redeemer_-_Cristo_Redentor.jpg', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Redentor_Over_Clouds_1.jpg/960px-Redentor_Over_Clouds_1.jpg')
  ) AS v(old, new)
 WHERE t.language = 'en' AND t.image_url = v.old;

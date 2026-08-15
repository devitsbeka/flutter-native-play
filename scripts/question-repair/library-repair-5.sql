UPDATE public.questions
   SET is_active = false, in_production = false,
       quality_status = 'retired_library'
 WHERE language = 'en'
   AND left(id::text, 8) IN (
     '0387cbcc', '0c78ade3', '0ec7baee', '13da3309', '162d0adc', '1a0b5123',
     '23bd8d18', '3131ebd1', '327dd3f3', '3a2f7bbd', '3bfe71a5', '55fefda5',
     '57a63bf7', '581e3fd3', '61a524ac', '64c60e99', '65f3dd50', '67728c15',
     '67bf272c', '6adeea3d', '732d9d5d', '74bcfccb', '78ab62c4', '893ca9d5',
     '8a0336be', '9649982a', '9918fe73', '998c237d', '9da8d70b', 'a0ac84a7',
     'acd419cf', 'b02bd858', 'b6709046', 'bac7dc3d', 'bdf8ecf9', 'ca478f8f',
     'd87d686f', 'dcbe9fb1', 'e542c0d2', 'f3c382fb'
   );

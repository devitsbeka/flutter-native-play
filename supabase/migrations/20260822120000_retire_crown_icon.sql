-- Retire the crown as a question icon.
--
-- The crown is the app's logo. 51 questions wore it as their icon, so a
-- question list read as a wall of MyTrivia logos — and "The Crown" TV
-- questions aside, it said nothing about the question in front of it.
--
-- Every question gets an icon that exists in icon_library and speaks to its
-- subject: Georgian kings the castle, Persian-empire questions the rug,
-- literature the quill, TV series the set, mythology the temple or the
-- Parthenon. Explicit per-row updates with the question quoted above each,
-- so the migration says exactly what it decided; a catch-all at the end
-- covers any row that gained the crown after this was written.
--
-- The library row is then deleted, which removes the crown from every picker
-- and every AI suggestion (they all read icon_library). The keyword maps in
-- the icon-assignment edge functions stop naming it in the same commit, so
-- nothing tries to assign a slug that no longer resolves.

-- რომელი იმპერია დააარსა კიროს დიდმა?
UPDATE public.questions SET icon_slug = 'persian-rug' WHERE icon_slug = 'crown' AND id = '394122b0-cdb6-4b84-8744-75e0bee19f6b';
-- ვის უწოდეს „ქართული პროზის დიდოსტატი“?
UPDATE public.questions SET icon_slug = 'feather-quill' WHERE icon_slug = 'crown' AND id = 'a8398155-d7a8-4a80-b0e8-47f7da42db30';
-- ვინ იყო ოსმალეთის სულთანი კონსტანტინოპოლის აღებისას?
UPDATE public.questions SET icon_slug = 'mosque' WHERE icon_slug = 'crown' AND id = 'e63ed948-d611-4856-8a95-f26db365f0d3';
-- რომელ სახელმწიფოს ჰყავს იმპერატორი?
UPDATE public.questions SET icon_slug = 'palace' WHERE icon_slug = 'crown' AND id = '5aba433e-6827-4faa-ade3-53422ac8c88b';
-- ვინ იყო სპარსეთის იმპერიის დამაარსებელი?
UPDATE public.questions SET icon_slug = 'persian-rug' WHERE icon_slug = 'crown' AND id = '7ccdfd4f-c459-4e8a-bbb4-e37aead5db34';
-- ბერძნულ მითში, ვინ გაიტაცა პერსეფონე?
UPDATE public.questions SET icon_slug = 'parthenon' WHERE icon_slug = 'crown' AND id = '46e08981-7eed-4ee1-944a-edf0a22215b0';
-- რამდენი სეზონია “სამეფო კარის თამაშებში”?
UPDATE public.questions SET icon_slug = 'dragon' WHERE icon_slug = 'crown' AND id = '827ed965-a7e6-496c-86ec-46584063be59';
-- რომელ ეპოქაში მოღვაწეობდა შოთა რუსთაველი?
UPDATE public.questions SET icon_slug = 'scroll' WHERE icon_slug = 'crown' AND id = '4a70653b-2548-49b5-b340-b7d8f29c2c83';
-- ვინ იყო ქართლ-კახეთის მეფე ერეკლე II-ის მამა?
UPDATE public.questions SET icon_slug = 'castle' WHERE icon_slug = 'crown' AND id = 'e0dec4b7-889b-4b16-ae28-fce866798272';
-- რომელი ქალღმერთი ითვლებოდა ოლიმპოს დედოფლად და ქორწი
UPDATE public.questions SET icon_slug = 'parthenon' WHERE icon_slug = 'crown' AND id = 'df761f3d-6ac8-496f-bf58-0c6feecf8209';
-- ვინ იყო ბრიტანეთის ყველაზე ხანგრძლივი მმართველი მონა
UPDATE public.questions SET icon_slug = 'palace' WHERE icon_slug = 'crown' AND id = 'a80f6af5-e54b-4a77-ab3f-b899184f9b13';
-- რომელი იყო გიორგი ბრწყინვალეს ვაჟი?
UPDATE public.questions SET icon_slug = 'castle' WHERE icon_slug = 'crown' AND id = '32d4f833-97b0-4561-9225-c43fc152059a';
-- რომელმა მეფემ დააარსა სპარსეთის იმპერია?
UPDATE public.questions SET icon_slug = 'persian-rug' WHERE icon_slug = 'crown' AND id = '75dc105e-7801-4255-ad94-3f50ac8dd134';
-- ვინ იყო მაკედონიის მეფე, რომლის იმპერიაც ვრცელი იყო?
UPDATE public.questions SET icon_slug = 'sword' WHERE icon_slug = 'crown' AND id = '2202763b-403f-4b0c-9300-93fa91d4e757';
-- ვის მიუძღვნა შოთა რუსთაველმა თავისი უკვდავი პოემა „ვ
UPDATE public.questions SET icon_slug = 'scroll' WHERE icon_slug = 'crown' AND id = 'b0cf9e57-9c9d-49af-9f59-513190708f91';
-- ქართული ლიტერატურის რომელი პერიოდია „ოქროს ხანა“?
UPDATE public.questions SET icon_slug = 'open-book' WHERE icon_slug = 'crown' AND id = 'f3baa4fd-c1b3-47c3-bfb9-222f3b95e440';
-- ვინ იყო აფხაზეთის პირველი მეფე?
UPDATE public.questions SET icon_slug = 'castle' WHERE icon_slug = 'crown' AND id = '36f043cf-322c-4250-a9b1-79c6d15a9441';
-- რომელ წელს დაარსა ნაპოლეონმა პირველი იმპერია?
UPDATE public.questions SET icon_slug = 'sword' WHERE icon_slug = 'crown' AND id = '882e6e9a-bd3c-49b0-930a-14434c9b0b94';
-- რომელი მონარქის ცხოვრებას ასახავს სერიალი „The Crown
UPDATE public.questions SET icon_slug = 'smart-tv' WHERE icon_slug = 'crown' AND id = 'f2233016-3109-435a-b695-606ddd866d4c';
-- ვინ იყო ინდუისტურ მითოლოგიაში სამყაროს შემნახველი?
UPDATE public.questions SET icon_slug = 'temple' WHERE icon_slug = 'crown' AND id = 'ae5be955-65e2-4b54-8c7a-e83668a3fdf6';
-- რომელი სამეფო დინასტიის შესახებ მოგვითხრობს სერიალი 
UPDATE public.questions SET icon_slug = 'smart-tv' WHERE icon_slug = 'crown' AND id = '45d3dcfc-d2c5-4e42-9c64-fc5d9f1d0679';
-- ჟურნალ „ფორბსის“ 2023 წლის მონაცემებით, რომელი რეპერ
UPDATE public.questions SET icon_slug = 'money-bag' WHERE icon_slug = 'crown' AND id = '61690113-3b57-478e-ae4a-d05094566bef';
-- რა ჰქვია თეიმურაზ I-ის პოემას, რომელიც ქეთევან დედოფ
UPDATE public.questions SET icon_slug = 'scroll' WHERE icon_slug = 'crown' AND id = '934091a5-a2ff-4c84-ac40-672a3234dc65';
-- Which song is Queen known for?
UPDATE public.questions SET icon_slug = 'guitar' WHERE icon_slug = 'crown' AND id = '94fda177-fe59-4cfe-9d65-31bee9cd11a7';
-- რომელი ქართველი მეფე იყო ცნობილი როგორც „აღმაშენებელ
UPDATE public.questions SET icon_slug = 'castle' WHERE icon_slug = 'crown' AND id = '367c38d3-6a05-42bc-a523-649c08bd31da';
-- რა ერქვა გიორგი ბრწყინვალეს დედას?
UPDATE public.questions SET icon_slug = 'castle' WHERE icon_slug = 'crown' AND id = '114ee323-6721-4582-84e1-a45e339cffdc';
-- ვინ იყო „ქართული ლირიკის დედოფალი“?
UPDATE public.questions SET icon_slug = 'feather-quill' WHERE icon_slug = 'crown' AND id = 'b99ac645-fa8e-4ddb-ae0e-4d8c640a0c43';
-- ვინ იყო ქართლის მეფე, რომლის დროსაც საქართველო გაქრი
UPDATE public.questions SET icon_slug = 'church' WHERE icon_slug = 'crown' AND id = '1f2994c4-4e6f-44fc-bb05-e4d3518bbbb4';
-- რომელი იყო მეფე ფარნავაზის დედაქალაქი?
UPDATE public.questions SET icon_slug = 'fortress' WHERE icon_slug = 'crown' AND id = 'b659be47-8080-4caa-a8ee-ec765e08b0ed';
-- ვინ არის ცნობილი როგორც „ქართული პროზის დედოფალი“?
UPDATE public.questions SET icon_slug = 'feather-quill' WHERE icon_slug = 'crown' AND id = 'ffa1c3fd-a2bc-43db-8207-0de951686cd4';
-- ვინ იყო ქართველი მეფე, მეტსახელად 'აღმაშენებელი'?
UPDATE public.questions SET icon_slug = 'castle' WHERE icon_slug = 'crown' AND id = 'e1d28f76-6b4e-4a4b-9e48-14842e5bd269';
-- რომელ წელს მოხდა ფარნავაზის გამეფება?
UPDATE public.questions SET icon_slug = 'fortress' WHERE icon_slug = 'crown' AND id = 'd73172e4-ef97-437b-bb43-8572f756d231';
-- ვინ იყო ვახტანგ გორგასლის მამა?
UPDATE public.questions SET icon_slug = 'castle' WHERE icon_slug = 'crown' AND id = '6a57a6cf-4b12-4b8a-86a0-7ec725f53a51';
-- რომელმა მეფემ მოაწერა ხელი მაგრა კარტას?
UPDATE public.questions SET icon_slug = 'scroll' WHERE icon_slug = 'crown' AND id = 'd142aee8-9251-4d5b-a98d-c1c54a3e1384';
-- When did Queen Elizabeth II pass away?
UPDATE public.questions SET icon_slug = 'palace' WHERE icon_slug = 'crown' AND id = '74286a6e-bfe1-4ab7-8f56-6c5f03497971';
-- Did Game of Thrones conclude before or after The Man
UPDATE public.questions SET icon_slug = 'smart-tv' WHERE icon_slug = 'crown' AND id = '3926a2c7-6de6-4a75-9773-107601cb9032';
-- Where is Game of Thrones primarily filmed?
UPDATE public.questions SET icon_slug = 'film-reel' WHERE icon_slug = 'crown' AND id = '2959665e-8c4a-4343-8f2f-559b793f1013';
-- Who made 'YOLO' a worldwide pop culture phenomenon?
UPDATE public.questions SET icon_slug = 'money-bag' WHERE icon_slug = 'crown' AND id = 'c31c59f5-d379-4b62-88b7-dcd38bf591aa';
-- ბალტიურ მითოლოგიაში ვინ იყო ჭექა-ქუხილის ღმერთი?
UPDATE public.questions SET icon_slug = 'lightning-bolt' WHERE icon_slug = 'crown' AND id = '0710fdb8-90ab-4358-ac10-18e7cafe208d';
-- Who ruled England but was never crowned monarch?
UPDATE public.questions SET icon_slug = 'castle' WHERE icon_slug = 'crown' AND id = '0f3cc434-3a13-41bb-9bf8-2f0f425c401e';
-- ვის მიეწერება ფრაზა „სახელმწიფო მე ვარ“?
UPDATE public.questions SET icon_slug = 'palace' WHERE icon_slug = 'crown' AND id = '9453258c-ea93-4c26-ae37-ac2d17cc4aca';
-- რომელმა ქართველმა მეფემ შექმნა სამართლის წიგნი, იგივ
UPDATE public.questions SET icon_slug = 'scroll' WHERE icon_slug = 'crown' AND id = '7b07b6ee-0dbd-4d47-a25c-0ba80025c588';
-- რომელმა ქართულმა სამეფომ იარსება XV-XIX ს. დასაწყისა
UPDATE public.questions SET icon_slug = 'fortress' WHERE icon_slug = 'crown' AND id = 'ae643af6-f745-4cfe-8a19-69e78008572e';
-- რა ჰქვია League of Legends-ის პერსონაჟებს?
UPDATE public.questions SET icon_slug = 'dragon' WHERE icon_slug = 'crown' AND id = '290455f1-4f42-4be4-b579-4ab4c114a226';
-- Which Prussian king founded Berlin's Academy?
UPDATE public.questions SET icon_slug = 'open-book' WHERE icon_slug = 'crown' AND id = '30b50fdf-cdaa-4c6e-89ed-866f1ea22144';
-- Whose French throne claim sparked the Hundred Years'
UPDATE public.questions SET icon_slug = 'sword' WHERE icon_slug = 'crown' AND id = '7aa87a70-0ace-4f91-b735-b8cf22243877';
-- Which historical period inspired 'The Crown' TV seri
UPDATE public.questions SET icon_slug = 'smart-tv' WHERE icon_slug = 'crown' AND id = 'e430748c-fbaf-4d58-a590-aa810bc34122';
-- Who tells Walder Frey that 'The North Remembers'?
UPDATE public.questions SET icon_slug = 'dragon' WHERE icon_slug = 'crown' AND id = '9ee42b23-fe5f-49e5-b964-33d86a31282a';
-- არგონავტების შესახებ მითების მიხედვით, რა ერქვა ძველ
UPDATE public.questions SET icon_slug = 'parthenon' WHERE icon_slug = 'crown' AND id = '5aa4df33-cddf-4e3a-993c-0fe70b8ad56a';
-- რომელი სერიალია ბრიტანეთის სამეფო ოჯახზე დაფუძნებული
UPDATE public.questions SET icon_slug = 'smart-tv' WHERE icon_slug = 'crown' AND id = 'aa58bc58-d080-4917-ba89-f043e8467257';
-- რომელი სერიალი ასახავს ელისაბედ II მმართველობას?
UPDATE public.questions SET icon_slug = 'smart-tv' WHERE icon_slug = 'crown' AND id = 'ec33b2ba-5aa0-44f4-999a-874ceb9b89bc';

-- ── Anything the list above missed (rows created after it was written) ─────
-- Castle: the least wrong default for the royalty-and-history questions the
-- crown was being put on.
UPDATE public.questions SET icon_slug = 'castle' WHERE icon_slug = 'crown';

-- ── The one player-made quiz carrying the crown inside its questions ───────
-- A music quiz ("მუსიკა"), so the guitar. Scoped to the row and to the exact
-- key-value pair, both spacings PostgREST and the client produce.
UPDATE public.user_quiz_posts
   SET questions = replace(questions::text, '"icon_slug": "crown"', '"icon_slug": "guitar"')::jsonb
 WHERE id = '6e8634e0-c025-4329-befa-e868d3d66dc2';
UPDATE public.user_quiz_posts
   SET questions = replace(questions::text, '"icon_slug":"crown"', '"icon_slug":"guitar"')::jsonb
 WHERE id = '6e8634e0-c025-4329-befa-e868d3d66dc2';

-- ── Out of the library, so no picker or AI suggestion offers it again ──────
DELETE FROM public.icon_library WHERE slug = 'crown';

DO $$
DECLARE v_left integer;
BEGIN
  SELECT count(*) INTO v_left FROM public.questions WHERE icon_slug = 'crown';
  RAISE NOTICE 'questions still wearing the crown: % (must be 0)', v_left;
END $$;

-- The King asks shorter questions, and more of them.
--
-- The owner's complaint, looking at the duel on a phone: questions running
-- to five or six lines, options to three or four, and a pool of 24 that
-- repeats. Two answers here.
--
-- 1. Twenty-four SHORT puzzles, in all seven languages: a question of a
--    line or two, options of a few words, a one-sentence derivation. Same
--    bar as the seeds — pure reasoning, culture-neutral, every wrong option
--    the answer a hasty solver actually produces. Each translation points
--    back to its English row through translated_from; icons are set here
--    rather than inherited. Idempotent per language, keyed by source tag.
--
-- 2. The draw prefers short questions. Both draw paths order by
--    king_question_is_long() before random(), so a long puzzle is dealt
--    only once the short ones a player has not seen are used up. The old
--    rows stay active; they just come last.

-- ── the short pool ─────────────────────────────────────────────────────────

INSERT INTO public.king_questions
  (language, question_text, correct_answer, incorrect_answers, explanation, difficulty, source, is_active, icon_slug)
SELECT * FROM (VALUES
  ('en', 'A bat and a ball cost 1.10 together. The bat costs 1.00 more than the ball. What does the ball cost?', '0.05', '["0.10", "0.15", "1.00"]'::jsonb, 'If the ball is x, the bat is x + 1.00, so 2x + 1.00 = 1.10 and x = 0.05.', 2, 'short-en-1', true, 'baseball'),
  ('en', '5 machines make 5 parts in 5 minutes. How long do 100 machines take to make 100 parts?', '5 minutes', '["100 minutes", "20 minutes", "1 minute"]'::jsonb, 'Each machine makes one part in 5 minutes, so 100 machines make 100 parts in the same 5 minutes.', 2, 'short-en-1', true, 'gear'),
  ('en', 'A lily patch doubles every day and covers the whole lake on day 48. On which day did it cover half?', 'Day 47', '["Day 24", "Day 46", "Day 12"]'::jsonb, 'It doubles daily, so the day before it was full it covered exactly half.', 2, 'short-en-1', true, 'lily'),
  ('en', 'Which weighs more: a kilogram of feathers or a kilogram of iron?', 'They weigh the same', '["The iron", "The feathers", "It depends on the volume"]'::jsonb, 'A kilogram is a kilogram; the feathers only take up more room.', 1, 'short-en-1', true, 'weight-scale'),
  ('en', 'A farmer has 17 sheep. All but 9 run away. How many sheep are left?', '9', '["8", "17", "26"]'::jsonb, '"All but 9" means 9 stayed; the trap is subtracting 9 from 17.', 1, 'short-en-1', true, 'sheep'),
  ('en', 'How many times can you subtract 5 from 25?', 'Once', '["Five times", "Four times", "As many as you like"]'::jsonb, 'After the first subtraction it is 20, not 25, so you can subtract 5 from 25 only once.', 1, 'short-en-1', true, 'calculator'),
  ('en', 'A clock takes 5 seconds to strike 6 o''clock. How long does it take to strike 12?', '11 seconds', '["10 seconds", "12 seconds", "6 seconds"]'::jsonb, 'Six strikes have five gaps of one second each; twelve strikes have eleven gaps.', 3, 'short-en-1', true, 'alarm-clock'),
  ('en', 'In a race you overtake the runner in second place. What place are you in now?', 'Second', '["First", "Third", "It depends"]'::jsonb, 'You took the place of the runner you passed; the leader is still ahead.', 1, 'short-en-1', true, 'running'),
  ('en', 'A brick weighs 1 kg plus half a brick. How much does the brick weigh?', '2 kg', '["1.5 kg", "1 kg", "3 kg"]'::jsonb, 'Half a brick is 1 kg, so a whole brick is 2 kg.', 2, 'short-en-1', true, 'brick'),
  ('en', 'How many months of the year have 28 days?', 'All of them', '["One", "Two", "None"]'::jsonb, 'Every month has at least 28 days; only February has no more.', 1, 'short-en-1', true, 'birthday-cake'),
  ('en', 'You have one match and enter a dark room with a candle, a lamp and a stove. What do you light first?', 'The match', '["The candle", "The lamp", "The stove"]'::jsonb, 'Nothing else can be lit until the match is.', 1, 'short-en-1', true, 'flashlight'),
  ('en', 'A rope ladder hangs over a boat''s side, rungs 30 cm apart. The tide rises 90 cm. How many rungs go under?', 'None', '["3", "2", "1"]'::jsonb, 'The boat floats, so it rises with the tide and the ladder rises with it.', 2, 'short-en-1', true, 'rowboat'),
  ('en', 'What number comes next: 2, 6, 12, 20, 30, ?', '42', '["40", "36", "44"]'::jsonb, 'The gaps grow by 2 each time (4, 6, 8, 10), so the next gap is 12: 30 + 12 = 42.', 2, 'short-en-1', true, 'calculator'),
  ('en', 'A doctor gives you 3 pills and says to take one every half hour. How long do they last?', '1 hour', '["1.5 hours", "30 minutes", "2 hours"]'::jsonb, 'Pill one now, pill two after 30 minutes, pill three after 60: three pills, two gaps.', 2, 'short-en-1', true, 'apple'),
  ('en', 'What is half of two, plus two?', '3', '["2", "4", "1"]'::jsonb, 'Half of two is one, and one plus two is three.', 1, 'short-en-1', true, 'coin'),
  ('en', 'Tom''s father has three sons: Snap, Crackle and…?', 'Tom', '["Pop", "Crunch", "There is no way to know"]'::jsonb, 'The father is Tom''s father, so Tom is his third son.', 1, 'short-en-1', true, 'family'),
  ('en', 'A box holds 12 apples. You take 3 of them. How many apples do you have?', '3', '["9", "12", "15"]'::jsonb, 'You have the three you took; the nine left belong to the box.', 1, 'short-en-1', true, 'apple'),
  ('en', 'Two fathers and two sons go fishing. Each catches one fish, yet only 3 fish are caught. How?', 'Grandfather, father and son', '["One fish was shared", "One of them lied", "It is impossible"]'::jsonb, 'Three people: the middle one is both a son and a father, so there are two fathers and two sons.', 3, 'short-en-1', true, 'family'),
  ('en', '8 people build a wall in 10 hours. How long do 4 people take, working at the same pace?', '20 hours', '["5 hours", "10 hours", "40 hours"]'::jsonb, 'Half the people need twice the time: 80 person-hours of work either way.', 2, 'short-en-1', true, 'brick'),
  ('en', 'Divide 30 by half and add 10. What do you get?', '70', '["25", "20", "40"]'::jsonb, 'Dividing by a half doubles: 30 ÷ ½ = 60, and 60 + 10 = 70.', 2, 'short-en-1', true, 'calculator'),
  ('en', 'A shepherd counts 22 legs in his flock, his own included. How many sheep does he have?', '5', '["6", "4", "11"]'::jsonb, 'Take away his own 2 legs: 20 legs at 4 per sheep is 5 sheep.', 2, 'short-en-1', true, 'sheep'),
  ('en', 'If today is two days after the day before Friday, what day is it?', 'Saturday', '["Friday", "Sunday", "Thursday"]'::jsonb, 'The day before Friday is Thursday; two days after Thursday is Saturday.', 3, 'short-en-1', true, 'alarm-clock'),
  ('en', 'A train leaves at 8:00 at 60 km/h. A second leaves the same station at 9:00 at 90 km/h. When does it catch up?', '11:00', '["10:00", "10:30", "12:00"]'::jsonb, 'At 9:00 the gap is 60 km and closes at 30 km/h, so it takes 2 hours.', 3, 'short-en-1', true, 'running'),
  ('en', '9 coins look identical; one is lighter. With a balance scale, how many weighings find it for sure?', '2', '["3", "4", "1"]'::jsonb, 'Weigh 3 against 3 to find the light group of 3, then 1 against 1 within it.', 3, 'short-en-1', true, 'weight-scale')
) AS seed(language, question_text, correct_answer, incorrect_answers, explanation, difficulty, source, is_active, icon_slug)
WHERE NOT EXISTS (SELECT 1 FROM public.king_questions WHERE source = 'short-en-1');

INSERT INTO public.king_questions
  (language, translated_from, question_text, correct_answer, incorrect_answers, explanation, difficulty, source, is_active, icon_slug)
SELECT
  'ka',
  (SELECT e.id FROM public.king_questions e
    WHERE e.source = 'short-en-1' AND e.question_text = seed.en_text LIMIT 1),
  seed.q, seed.a, seed.w::jsonb, seed.x, seed.d, 'short-ka-1', true, seed.icon
FROM (VALUES
  ('A bat and a ball cost 1.10 together. The bat costs 1.00 more than the ball. What does the ball cost?', 'ბიტა და ბურთი ერთად 1.10 ღირს. ბიტა ბურთზე 1.00-ით ძვირია. რა ღირს ბურთი?', '0.05', '["0.10", "0.15", "1.00"]', 'თუ ბურთი x-ია, ბიტა x + 1.00-ია, ანუ 2x + 1.00 = 1.10 და x = 0.05.', 2, 'baseball'),
  ('5 machines make 5 parts in 5 minutes. How long do 100 machines take to make 100 parts?', '5 დანადგარი 5 დეტალს 5 წუთში ამზადებს. რამდენ ხანში გააკეთებს 100 დანადგარი 100 დეტალს?', '5 წუთში', '["100 წუთში", "20 წუთში", "1 წუთში"]', 'თითო დანადგარი ერთ დეტალს 5 წუთში აკეთებს, ამიტომ 100 დანადგარი 100 დეტალს იმავე 5 წუთში გააკეთებს.', 2, 'gear'),
  ('A lily patch doubles every day and covers the whole lake on day 48. On which day did it cover half?', 'შროშანები ყოველდღე ორმაგდება და ტბას 48-ე დღეს მთლიანად ფარავს. რომელ დღეს ფარავდა ნახევარს?', '47-ე დღეს', '["24-ე დღეს", "46-ე დღეს", "12-ე დღეს"]', 'ყოველდღე ორმაგდება, ამიტომ სავსე ტბამდე ერთი დღით ადრე ზუსტად ნახევარი იყო დაფარული.', 2, 'lily'),
  ('Which weighs more: a kilogram of feathers or a kilogram of iron?', 'რომელი უფრო მძიმეა: ერთი კილოგრამი ბუმბული თუ ერთი კილოგრამი რკინა?', 'ერთნაირად იწონიან', '["რკინა", "ბუმბული", "მოცულობაზეა დამოკიდებული"]', 'კილოგრამი კილოგრამია — ბუმბული უბრალოდ მეტ ადგილს იკავებს.', 1, 'weight-scale'),
  ('A farmer has 17 sheep. All but 9 run away. How many sheep are left?', 'ფერმერს 17 ცხვარი ჰყავს. 9-ის გარდა ყველა გაიქცა. რამდენი ცხვარი დარჩა?', '9', '["8", "17", "26"]', '„9-ის გარდა ყველა“ ნიშნავს, რომ 9 დარჩა; ხაფანგი 17-ს 9-ის გამოკლებაა.', 1, 'sheep'),
  ('How many times can you subtract 5 from 25?', 'რამდენჯერ შეიძლება 25-ს 5 გამოაკლო?', 'ერთხელ', '["ხუთჯერ", "ოთხჯერ", "რამდენჯერაც გინდა"]', 'პირველი გამოკლების შემდეგ უკვე 20 გაქვს და არა 25, ამიტომ 25-ს 5 მხოლოდ ერთხელ აკლდება.', 1, 'calculator'),
  ('A clock takes 5 seconds to strike 6 o''clock. How long does it take to strike 12?', 'საათი 6 საათს 5 წამში რეკავს. რამდენ ხანში დარეკავს 12 საათს?', '11 წამში', '["10 წამში", "12 წამში", "6 წამში"]', 'ექვს დარტყმას შორის ხუთი ერთწამიანი პაუზაა; თორმეტ დარტყმას შორის — თერთმეტი.', 3, 'alarm-clock'),
  ('In a race you overtake the runner in second place. What place are you in now?', 'რბოლაში მეორე ადგილზე მყოფ მორბენალს გაუსწარი. რომელ ადგილზე ხარ ახლა?', 'მეორეზე', '["პირველზე", "მესამეზე", "გააჩნია"]', 'იმის ადგილი დაიკავე, ვისაც გაუსწარი; ლიდერი ისევ წინაა.', 1, 'running'),
  ('A brick weighs 1 kg plus half a brick. How much does the brick weigh?', 'აგური 1 კგ-ს პლუს ნახევარ აგურს იწონის. რამდენს იწონის აგური?', '2 კგ', '["1.5 კგ", "1 კგ", "3 კგ"]', 'ნახევარი აგური 1 კგ-ია, ამიტომ მთელი აგური 2 კგ-ს იწონის.', 2, 'brick'),
  ('How many months of the year have 28 days?', 'წელიწადში რამდენ თვეს აქვს 28 დღე?', 'ყველას', '["ერთს", "ორს", "არცერთს"]', 'ყველა თვეს სულ მცირე 28 დღე აქვს; მხოლოდ თებერვალს არ აქვს მეტი.', 1, 'birthday-cake'),
  ('You have one match and enter a dark room with a candle, a lamp and a stove. What do you light first?', 'გაქვს ერთი ასანთი და შედიხარ ბნელ ოთახში, სადაც სანთელი, ლამპა და ღუმელია. რას აანთებ პირველად?', 'ასანთს', '["სანთელს", "ლამპას", "ღუმელს"]', 'სანამ ასანთი არ აინთება, სხვა ვერაფერს აანთებ.', 1, 'flashlight'),
  ('A rope ladder hangs over a boat''s side, rungs 30 cm apart. The tide rises 90 cm. How many rungs go under?', 'ნავის გვერდზე თოკის კიბე ჰკიდია, საფეხურებს შორის 30 სმ-ია. მოქცევა 90 სმ-ით მოიმატებს. რამდენი საფეხური ჩაიძირება?', 'არცერთი', '["3", "2", "1"]', 'ნავი ტივტივებს, ამიტომ წყალთან ერთად ადის და კიბეც მასთან ერთად.', 2, 'rowboat'),
  ('What number comes next: 2, 6, 12, 20, 30, ?', 'რომელი რიცხვია შემდეგი: 2, 6, 12, 20, 30, ?', '42', '["40", "36", "44"]', 'სხვაობები ყოველ ჯერზე 2-ით იზრდება (4, 6, 8, 10), ამიტომ შემდეგი სხვაობა 12-ია: 30 + 12 = 42.', 2, 'calculator'),
  ('A doctor gives you 3 pills and says to take one every half hour. How long do they last?', 'ექიმმა 3 აბი მოგცა და გითხრა, ყოველ ნახევარ საათში თითო დალიეო. რამდენ ხანს გეყოფა?', '1 საათს', '["1.5 საათს", "30 წუთს", "2 საათს"]', 'პირველი აბი ახლა, მეორე 30 წუთში, მესამე 60 წუთში: სამი აბი, ორი შუალედი.', 2, 'apple'),
  ('What is half of two, plus two?', 'რა არის ორის ნახევარს პლუს ორი?', '3', '["2", "4", "1"]', 'ორის ნახევარი ერთია, ერთს პლუს ორი კი სამი.', 1, 'coin'),
  ('Tom''s father has three sons: Snap, Crackle and…?', 'თომას მამას სამი ვაჟი ჰყავს: სნეპი, კრეკლი და…?', 'თომა', '["პოპი", "კრანჩი", "ვერ გავიგებთ"]', 'მამა თომას მამაა, ამიტომ მესამე ვაჟი თავად თომაა.', 1, 'family'),
  ('A box holds 12 apples. You take 3 of them. How many apples do you have?', 'ყუთში 12 ვაშლია. შენ 3 აიღე. რამდენი ვაშლი გაქვს?', '3', '["9", "12", "15"]', 'შენ ის სამი გაქვს, რაც აიღე; დარჩენილი ცხრა ყუთშია.', 1, 'apple'),
  ('Two fathers and two sons go fishing. Each catches one fish, yet only 3 fish are caught. How?', 'ორი მამა და ორი ვაჟი თევზაობენ. თითოეულმა ერთი თევზი დაიჭირა, სულ კი 3 თევზია. როგორ?', 'ბაბუა, მამა და შვილი', '["ერთი თევზი გაიყვეს", "ერთ-ერთმა მოიტყუა", "ეს შეუძლებელია"]', 'სამი ადამიანია: შუათანა ვაჟიცაა და მამაც, ამიტომ ორი მამა და ორი ვაჟი გამოდის.', 3, 'family'),
  ('8 people build a wall in 10 hours. How long do 4 people take, working at the same pace?', '8 კაცი კედელს 10 საათში აშენებს. რამდენ ხანში ააშენებს 4 კაცი იმავე ტემპით?', '20 საათში', '["5 საათში", "10 საათში", "40 საათში"]', 'ნახევარ ხალხს ორჯერ მეტი დრო სჭირდება: სამუშაო ორივე შემთხვევაში 80 კაც-საათია.', 2, 'brick'),
  ('Divide 30 by half and add 10. What do you get?', '30 გაყავი ნახევარზე და დაუმატე 10. რას მიიღებ?', '70', '["25", "20", "40"]', 'ნახევარზე გაყოფა ორმაგდება: 30 ÷ ½ = 60, და 60 + 10 = 70.', 2, 'calculator'),
  ('A shepherd counts 22 legs in his flock, his own included. How many sheep does he have?', 'მწყემსმა ფარაში 22 ფეხი დათვალა, საკუთარის ჩათვლით. რამდენი ცხვარი ჰყავს?', '5', '["6", "4", "11"]', 'მისი 2 ფეხი გამოაკელი: 20 ფეხი, თითო ცხვარზე 4 — 5 ცხვარი.', 2, 'sheep'),
  ('If today is two days after the day before Friday, what day is it?', 'თუ დღეს პარასკევის წინა დღიდან ორი დღის შემდეგია, რა დღეა?', 'შაბათი', '["პარასკევი", "კვირა", "ხუთშაბათი"]', 'პარასკევის წინა დღე ხუთშაბათია; ხუთშაბათიდან ორი დღის შემდეგ შაბათია.', 3, 'alarm-clock'),
  ('A train leaves at 8:00 at 60 km/h. A second leaves the same station at 9:00 at 90 km/h. When does it catch up?', 'მატარებელი 8:00-ზე გადის 60 კმ/სთ სიჩქარით. მეორე იმავე სადგურიდან 9:00-ზე გადის 90 კმ/სთ-ით. როდის დაეწევა?', '11:00-ზე', '["10:00-ზე", "10:30-ზე", "12:00-ზე"]', '9:00-ზე დაშორება 60 კმ-ია და საათში 30 კმ-ით მცირდება, ანუ 2 საათი სჭირდება.', 3, 'running'),
  ('9 coins look identical; one is lighter. With a balance scale, how many weighings find it for sure?', '9 ერთნაირი მონეტაა; ერთი მსუბუქია. სასწორით მინიმუმ რამდენი აწონვით იპოვი აუცილებლად?', '2', '["3", "4", "1"]', 'აწონე 3 სამის წინააღმდეგ და იპოვე მსუბუქი სამეული, მერე მასში 1 ერთის წინააღმდეგ.', 3, 'weight-scale')
) AS seed(en_text, q, a, w, x, d, icon)
WHERE NOT EXISTS (SELECT 1 FROM public.king_questions WHERE source = 'short-ka-1');

INSERT INTO public.king_questions
  (language, translated_from, question_text, correct_answer, incorrect_answers, explanation, difficulty, source, is_active, icon_slug)
SELECT
  'es',
  (SELECT e.id FROM public.king_questions e
    WHERE e.source = 'short-en-1' AND e.question_text = seed.en_text LIMIT 1),
  seed.q, seed.a, seed.w::jsonb, seed.x, seed.d, 'short-es-1', true, seed.icon
FROM (VALUES
  ('A bat and a ball cost 1.10 together. The bat costs 1.00 more than the ball. What does the ball cost?', 'Un bate y una pelota cuestan 1,10 juntos. El bate cuesta 1,00 más que la pelota. ¿Cuánto cuesta la pelota?', '0,05', '["0,10", "0,15", "1,00"]', 'Si la pelota es x, el bate es x + 1,00, así que 2x + 1,00 = 1,10 y x = 0,05.', 2, 'baseball'),
  ('5 machines make 5 parts in 5 minutes. How long do 100 machines take to make 100 parts?', '5 máquinas hacen 5 piezas en 5 minutos. ¿Cuánto tardan 100 máquinas en hacer 100 piezas?', '5 minutos', '["100 minutos", "20 minutos", "1 minuto"]', 'Cada máquina hace una pieza en 5 minutos, así que 100 máquinas hacen 100 piezas en los mismos 5 minutos.', 2, 'gear'),
  ('A lily patch doubles every day and covers the whole lake on day 48. On which day did it cover half?', 'Unos nenúfares se duplican cada día y cubren todo el lago el día 48. ¿Qué día cubrían la mitad?', 'El día 47', '["El día 24", "El día 46", "El día 12"]', 'Se duplican a diario, así que el día antes de llenarlo cubrían exactamente la mitad.', 2, 'lily'),
  ('Which weighs more: a kilogram of feathers or a kilogram of iron?', '¿Qué pesa más: un kilo de plumas o un kilo de hierro?', 'Pesan lo mismo', '["El hierro", "Las plumas", "Depende del volumen"]', 'Un kilo es un kilo; las plumas solo ocupan más espacio.', 1, 'weight-scale'),
  ('A farmer has 17 sheep. All but 9 run away. How many sheep are left?', 'Un granjero tiene 17 ovejas. Se escapan todas menos 9. ¿Cuántas quedan?', '9', '["8", "17", "26"]', '"Todas menos 9" significa que 9 se quedaron; la trampa es restar 9 a 17.', 1, 'sheep'),
  ('How many times can you subtract 5 from 25?', '¿Cuántas veces puedes restar 5 de 25?', 'Una vez', '["Cinco veces", "Cuatro veces", "Las que quieras"]', 'Tras la primera resta tienes 20, no 25, así que a 25 solo le puedes restar 5 una vez.', 1, 'calculator'),
  ('A clock takes 5 seconds to strike 6 o''clock. How long does it take to strike 12?', 'Un reloj tarda 5 segundos en dar las 6. ¿Cuánto tarda en dar las 12?', '11 segundos', '["10 segundos", "12 segundos", "6 segundos"]', 'Seis campanadas tienen cinco pausas de un segundo; doce campanadas tienen once.', 3, 'alarm-clock'),
  ('In a race you overtake the runner in second place. What place are you in now?', 'En una carrera adelantas al que va segundo. ¿En qué puesto vas ahora?', 'Segundo', '["Primero", "Tercero", "Depende"]', 'Ocupas el puesto del corredor al que adelantaste; el líder sigue delante.', 1, 'running'),
  ('A brick weighs 1 kg plus half a brick. How much does the brick weigh?', 'Un ladrillo pesa 1 kg más medio ladrillo. ¿Cuánto pesa el ladrillo?', '2 kg', '["1,5 kg", "1 kg", "3 kg"]', 'Medio ladrillo pesa 1 kg, así que uno entero pesa 2 kg.', 2, 'brick'),
  ('How many months of the year have 28 days?', '¿Cuántos meses del año tienen 28 días?', 'Todos', '["Uno", "Dos", "Ninguno"]', 'Todos los meses tienen al menos 28 días; solo febrero no tiene más.', 1, 'birthday-cake'),
  ('You have one match and enter a dark room with a candle, a lamp and a stove. What do you light first?', 'Tienes una cerilla y entras en un cuarto oscuro con una vela, una lámpara y una estufa. ¿Qué enciendes primero?', 'La cerilla', '["La vela", "La lámpara", "La estufa"]', 'Nada más se puede encender hasta que se enciende la cerilla.', 1, 'flashlight'),
  ('A rope ladder hangs over a boat''s side, rungs 30 cm apart. The tide rises 90 cm. How many rungs go under?', 'Una escalera de cuerda cuelga de un barco, con peldaños cada 30 cm. La marea sube 90 cm. ¿Cuántos peldaños se hunden?', 'Ninguno', '["3", "2", "1"]', 'El barco flota, así que sube con la marea y la escalera sube con él.', 2, 'rowboat'),
  ('What number comes next: 2, 6, 12, 20, 30, ?', '¿Qué número sigue: 2, 6, 12, 20, 30, ?', '42', '["40", "36", "44"]', 'Las diferencias crecen de 2 en 2 (4, 6, 8, 10), así que la siguiente es 12: 30 + 12 = 42.', 2, 'calculator'),
  ('A doctor gives you 3 pills and says to take one every half hour. How long do they last?', 'Un médico te da 3 pastillas y dice que tomes una cada media hora. ¿Cuánto duran?', '1 hora', '["1,5 horas", "30 minutos", "2 horas"]', 'Una ahora, otra a los 30 minutos y la tercera a los 60: tres pastillas, dos intervalos.', 2, 'apple'),
  ('What is half of two, plus two?', '¿Cuánto es la mitad de dos, más dos?', '3', '["2", "4", "1"]', 'La mitad de dos es uno, y uno más dos es tres.', 1, 'coin'),
  ('Tom''s father has three sons: Snap, Crackle and…?', 'El padre de Tomás tiene tres hijos: Snap, Crackle y…?', 'Tomás', '["Pop", "Crunch", "No se puede saber"]', 'El padre es el padre de Tomás, así que el tercer hijo es Tomás.', 1, 'family'),
  ('A box holds 12 apples. You take 3 of them. How many apples do you have?', 'Una caja tiene 12 manzanas. Coges 3. ¿Cuántas manzanas tienes?', '3', '["9", "12", "15"]', 'Tienes las tres que cogiste; las nueve restantes son de la caja.', 1, 'apple'),
  ('Two fathers and two sons go fishing. Each catches one fish, yet only 3 fish are caught. How?', 'Dos padres y dos hijos van a pescar. Cada uno pesca un pez, pero solo hay 3 peces. ¿Cómo?', 'Abuelo, padre e hijo', '["Compartieron un pez", "Uno mintió", "Es imposible"]', 'Son tres personas: el del medio es hijo y padre a la vez, así que hay dos padres y dos hijos.', 3, 'family'),
  ('8 people build a wall in 10 hours. How long do 4 people take, working at the same pace?', '8 personas levantan un muro en 10 horas. ¿Cuánto tardan 4 personas al mismo ritmo?', '20 horas', '["5 horas", "10 horas", "40 horas"]', 'La mitad de gente necesita el doble de tiempo: son 80 horas-persona en ambos casos.', 2, 'brick'),
  ('Divide 30 by half and add 10. What do you get?', 'Divide 30 entre un medio y suma 10. ¿Qué obtienes?', '70', '["25", "20", "40"]', 'Dividir entre un medio duplica: 30 ÷ ½ = 60, y 60 + 10 = 70.', 2, 'calculator'),
  ('A shepherd counts 22 legs in his flock, his own included. How many sheep does he have?', 'Un pastor cuenta 22 patas en su rebaño, incluidas las suyas. ¿Cuántas ovejas tiene?', '5', '["6", "4", "11"]', 'Quita sus 2 piernas: 20 patas a 4 por oveja son 5 ovejas.', 2, 'sheep'),
  ('If today is two days after the day before Friday, what day is it?', 'Si hoy es dos días después del día anterior al viernes, ¿qué día es?', 'Sábado', '["Viernes", "Domingo", "Jueves"]', 'El día anterior al viernes es jueves; dos días después del jueves es sábado.', 3, 'alarm-clock'),
  ('A train leaves at 8:00 at 60 km/h. A second leaves the same station at 9:00 at 90 km/h. When does it catch up?', 'Un tren sale a las 8:00 a 60 km/h. Otro sale de la misma estación a las 9:00 a 90 km/h. ¿Cuándo lo alcanza?', 'A las 11:00', '["A las 10:00", "A las 10:30", "A las 12:00"]', 'A las 9:00 la distancia es de 60 km y se cierra a 30 km/h, así que tarda 2 horas.', 3, 'running'),
  ('9 coins look identical; one is lighter. With a balance scale, how many weighings find it for sure?', '9 monedas parecen iguales; una pesa menos. Con una balanza, ¿cuántas pesadas la encuentran seguro?', '2', '["3", "4", "1"]', 'Pesa 3 contra 3 para hallar el grupo ligero de 3, y luego 1 contra 1 dentro de él.', 3, 'weight-scale')
) AS seed(en_text, q, a, w, x, d, icon)
WHERE NOT EXISTS (SELECT 1 FROM public.king_questions WHERE source = 'short-es-1');

INSERT INTO public.king_questions
  (language, translated_from, question_text, correct_answer, incorrect_answers, explanation, difficulty, source, is_active, icon_slug)
SELECT
  'de',
  (SELECT e.id FROM public.king_questions e
    WHERE e.source = 'short-en-1' AND e.question_text = seed.en_text LIMIT 1),
  seed.q, seed.a, seed.w::jsonb, seed.x, seed.d, 'short-de-1', true, seed.icon
FROM (VALUES
  ('A bat and a ball cost 1.10 together. The bat costs 1.00 more than the ball. What does the ball cost?', 'Schläger und Ball kosten zusammen 1,10. Der Schläger kostet 1,00 mehr als der Ball. Was kostet der Ball?', '0,05', '["0,10", "0,15", "1,00"]', 'Ist der Ball x, kostet der Schläger x + 1,00, also 2x + 1,00 = 1,10 und x = 0,05.', 2, 'baseball'),
  ('5 machines make 5 parts in 5 minutes. How long do 100 machines take to make 100 parts?', '5 Maschinen machen 5 Teile in 5 Minuten. Wie lange brauchen 100 Maschinen für 100 Teile?', '5 Minuten', '["100 Minuten", "20 Minuten", "1 Minute"]', 'Jede Maschine macht ein Teil in 5 Minuten, also machen 100 Maschinen 100 Teile in denselben 5 Minuten.', 2, 'gear'),
  ('A lily patch doubles every day and covers the whole lake on day 48. On which day did it cover half?', 'Seerosen verdoppeln sich täglich und bedecken den See an Tag 48 ganz. An welchem Tag war es die Hälfte?', 'Tag 47', '["Tag 24", "Tag 46", "Tag 12"]', 'Sie verdoppeln sich täglich, also war am Tag vor dem vollen See genau die Hälfte bedeckt.', 2, 'lily'),
  ('Which weighs more: a kilogram of feathers or a kilogram of iron?', 'Was wiegt mehr: ein Kilo Federn oder ein Kilo Eisen?', 'Gleich viel', '["Das Eisen", "Die Federn", "Kommt auf das Volumen an"]', 'Ein Kilo ist ein Kilo; die Federn brauchen nur mehr Platz.', 1, 'weight-scale'),
  ('A farmer has 17 sheep. All but 9 run away. How many sheep are left?', 'Ein Bauer hat 17 Schafe. Alle bis auf 9 laufen weg. Wie viele bleiben?', '9', '["8", "17", "26"]', '„Alle bis auf 9“ heißt, 9 sind geblieben; die Falle ist 17 minus 9.', 1, 'sheep'),
  ('How many times can you subtract 5 from 25?', 'Wie oft kann man 5 von 25 abziehen?', 'Einmal', '["Fünfmal", "Viermal", "Beliebig oft"]', 'Nach dem ersten Abziehen hat man 20, nicht 25 – von 25 kann man 5 nur einmal abziehen.', 1, 'calculator'),
  ('A clock takes 5 seconds to strike 6 o''clock. How long does it take to strike 12?', 'Eine Uhr braucht 5 Sekunden, um 6 zu schlagen. Wie lange braucht sie für 12?', '11 Sekunden', '["10 Sekunden", "12 Sekunden", "6 Sekunden"]', 'Sechs Schläge haben fünf Pausen von je einer Sekunde; zwölf Schläge haben elf.', 3, 'alarm-clock'),
  ('In a race you overtake the runner in second place. What place are you in now?', 'In einem Rennen überholst du den Zweiten. Auf welchem Platz bist du jetzt?', 'Zweiter', '["Erster", "Dritter", "Kommt darauf an"]', 'Du hast den Platz dessen übernommen, den du überholt hast; der Erste ist noch vorn.', 1, 'running'),
  ('A brick weighs 1 kg plus half a brick. How much does the brick weigh?', 'Ein Ziegel wiegt 1 kg plus einen halben Ziegel. Wie viel wiegt der Ziegel?', '2 kg', '["1,5 kg", "1 kg", "3 kg"]', 'Ein halber Ziegel wiegt 1 kg, also wiegt ein ganzer 2 kg.', 2, 'brick'),
  ('How many months of the year have 28 days?', 'Wie viele Monate im Jahr haben 28 Tage?', 'Alle', '["Einer", "Zwei", "Keiner"]', 'Jeder Monat hat mindestens 28 Tage; nur der Februar hat nicht mehr.', 1, 'birthday-cake'),
  ('You have one match and enter a dark room with a candle, a lamp and a stove. What do you light first?', 'Du hast ein Streichholz und betrittst einen dunklen Raum mit Kerze, Lampe und Ofen. Was zündest du zuerst an?', 'Das Streichholz', '["Die Kerze", "Die Lampe", "Den Ofen"]', 'Nichts anderes lässt sich anzünden, bevor das Streichholz brennt.', 1, 'flashlight'),
  ('A rope ladder hangs over a boat''s side, rungs 30 cm apart. The tide rises 90 cm. How many rungs go under?', 'Eine Strickleiter hängt an einem Boot, Sprossen alle 30 cm. Die Flut steigt 90 cm. Wie viele Sprossen gehen unter?', 'Keine', '["3", "2", "1"]', 'Das Boot schwimmt, steigt also mit der Flut – und die Leiter mit ihm.', 2, 'rowboat'),
  ('What number comes next: 2, 6, 12, 20, 30, ?', 'Welche Zahl kommt als Nächstes: 2, 6, 12, 20, 30, ?', '42', '["40", "36", "44"]', 'Die Abstände wachsen jeweils um 2 (4, 6, 8, 10), der nächste ist also 12: 30 + 12 = 42.', 2, 'calculator'),
  ('A doctor gives you 3 pills and says to take one every half hour. How long do they last?', 'Ein Arzt gibt dir 3 Tabletten, alle halbe Stunde eine. Wie lange reichen sie?', '1 Stunde', '["1,5 Stunden", "30 Minuten", "2 Stunden"]', 'Eine jetzt, eine nach 30 Minuten, eine nach 60: drei Tabletten, zwei Abstände.', 2, 'apple'),
  ('What is half of two, plus two?', 'Was ist die Hälfte von zwei, plus zwei?', '3', '["2", "4", "1"]', 'Die Hälfte von zwei ist eins, und eins plus zwei ist drei.', 1, 'coin'),
  ('Tom''s father has three sons: Snap, Crackle and…?', 'Toms Vater hat drei Söhne: Snap, Crackle und …?', 'Tom', '["Pop", "Crunch", "Das kann man nicht wissen"]', 'Der Vater ist Toms Vater, also ist Tom der dritte Sohn.', 1, 'family'),
  ('A box holds 12 apples. You take 3 of them. How many apples do you have?', 'In einer Kiste sind 12 Äpfel. Du nimmst 3. Wie viele Äpfel hast du?', '3', '["9", "12", "15"]', 'Du hast die drei, die du genommen hast; die neun übrigen gehören der Kiste.', 1, 'apple'),
  ('Two fathers and two sons go fishing. Each catches one fish, yet only 3 fish are caught. How?', 'Zwei Väter und zwei Söhne gehen angeln. Jeder fängt einen Fisch, doch es sind nur 3 Fische. Wie?', 'Großvater, Vater und Sohn', '["Ein Fisch wurde geteilt", "Einer hat gelogen", "Das geht nicht"]', 'Drei Personen: der mittlere ist Sohn und Vater zugleich, also zwei Väter und zwei Söhne.', 3, 'family'),
  ('8 people build a wall in 10 hours. How long do 4 people take, working at the same pace?', '8 Leute bauen eine Mauer in 10 Stunden. Wie lange brauchen 4 Leute im selben Tempo?', '20 Stunden', '["5 Stunden", "10 Stunden", "40 Stunden"]', 'Halb so viele Leute brauchen doppelt so lange: 80 Personenstunden in beiden Fällen.', 2, 'brick'),
  ('Divide 30 by half and add 10. What do you get?', 'Teile 30 durch ein Halb und addiere 10. Was kommt heraus?', '70', '["25", "20", "40"]', 'Durch ein Halb teilen verdoppelt: 30 ÷ ½ = 60, und 60 + 10 = 70.', 2, 'calculator'),
  ('A shepherd counts 22 legs in his flock, his own included. How many sheep does he have?', 'Ein Hirte zählt 22 Beine in seiner Herde, seine eigenen mitgezählt. Wie viele Schafe hat er?', '5', '["6", "4", "11"]', 'Zieh seine 2 Beine ab: 20 Beine zu je 4 pro Schaf sind 5 Schafe.', 2, 'sheep'),
  ('If today is two days after the day before Friday, what day is it?', 'Wenn heute zwei Tage nach dem Tag vor Freitag ist, welcher Tag ist heute?', 'Samstag', '["Freitag", "Sonntag", "Donnerstag"]', 'Der Tag vor Freitag ist Donnerstag; zwei Tage nach Donnerstag ist Samstag.', 3, 'alarm-clock'),
  ('A train leaves at 8:00 at 60 km/h. A second leaves the same station at 9:00 at 90 km/h. When does it catch up?', 'Ein Zug fährt um 8:00 mit 60 km/h ab. Ein zweiter fährt um 9:00 vom selben Bahnhof mit 90 km/h. Wann holt er ihn ein?', 'Um 11:00', '["Um 10:00", "Um 10:30", "Um 12:00"]', 'Um 9:00 beträgt der Abstand 60 km und schrumpft um 30 km/h, also dauert es 2 Stunden.', 3, 'running'),
  ('9 coins look identical; one is lighter. With a balance scale, how many weighings find it for sure?', '9 Münzen sehen gleich aus; eine ist leichter. Wie viele Wägungen mit einer Balkenwaage finden sie sicher?', '2', '["3", "4", "1"]', 'Wiege 3 gegen 3, um die leichte Dreiergruppe zu finden, dann darin 1 gegen 1.', 3, 'weight-scale')
) AS seed(en_text, q, a, w, x, d, icon)
WHERE NOT EXISTS (SELECT 1 FROM public.king_questions WHERE source = 'short-de-1');

INSERT INTO public.king_questions
  (language, translated_from, question_text, correct_answer, incorrect_answers, explanation, difficulty, source, is_active, icon_slug)
SELECT
  'fr',
  (SELECT e.id FROM public.king_questions e
    WHERE e.source = 'short-en-1' AND e.question_text = seed.en_text LIMIT 1),
  seed.q, seed.a, seed.w::jsonb, seed.x, seed.d, 'short-fr-1', true, seed.icon
FROM (VALUES
  ('A bat and a ball cost 1.10 together. The bat costs 1.00 more than the ball. What does the ball cost?', 'Une batte et une balle coûtent 1,10 ensemble. La batte coûte 1,00 de plus que la balle. Combien coûte la balle ?', '0,05', '["0,10", "0,15", "1,00"]', 'Si la balle vaut x, la batte vaut x + 1,00, donc 2x + 1,00 = 1,10 et x = 0,05.', 2, 'baseball'),
  ('5 machines make 5 parts in 5 minutes. How long do 100 machines take to make 100 parts?', '5 machines font 5 pièces en 5 minutes. Combien de temps mettent 100 machines pour 100 pièces ?', '5 minutes', '["100 minutes", "20 minutes", "1 minute"]', 'Chaque machine fait une pièce en 5 minutes, donc 100 machines font 100 pièces dans les mêmes 5 minutes.', 2, 'gear'),
  ('A lily patch doubles every day and covers the whole lake on day 48. On which day did it cover half?', 'Des nénuphars doublent chaque jour et couvrent tout le lac le jour 48. Quel jour couvraient-ils la moitié ?', 'Le jour 47', '["Le jour 24", "Le jour 46", "Le jour 12"]', 'Ils doublent chaque jour, donc la veille du lac plein, ils en couvraient exactement la moitié.', 2, 'lily'),
  ('Which weighs more: a kilogram of feathers or a kilogram of iron?', 'Qu''est-ce qui pèse le plus : un kilo de plumes ou un kilo de fer ?', 'Le même poids', '["Le fer", "Les plumes", "Ça dépend du volume"]', 'Un kilo est un kilo ; les plumes prennent seulement plus de place.', 1, 'weight-scale'),
  ('A farmer has 17 sheep. All but 9 run away. How many sheep are left?', 'Un fermier a 17 moutons. Tous s''enfuient sauf 9. Combien en reste-t-il ?', '9', '["8", "17", "26"]', '« Tous sauf 9 » veut dire que 9 sont restés ; le piège est de faire 17 moins 9.', 1, 'sheep'),
  ('How many times can you subtract 5 from 25?', 'Combien de fois peut-on soustraire 5 de 25 ?', 'Une fois', '["Cinq fois", "Quatre fois", "Autant qu''on veut"]', 'Après la première soustraction on a 20, pas 25 : on ne peut soustraire 5 de 25 qu''une fois.', 1, 'calculator'),
  ('A clock takes 5 seconds to strike 6 o''clock. How long does it take to strike 12?', 'Une horloge met 5 secondes à sonner 6 heures. Combien de temps pour sonner 12 heures ?', '11 secondes', '["10 secondes", "12 secondes", "6 secondes"]', 'Six coups font cinq pauses d''une seconde ; douze coups en font onze.', 3, 'alarm-clock'),
  ('In a race you overtake the runner in second place. What place are you in now?', 'Dans une course, tu doubles le deuxième. À quelle place es-tu maintenant ?', 'Deuxième', '["Première", "Troisième", "Ça dépend"]', 'Tu as pris la place de celui que tu as doublé ; le premier est toujours devant.', 1, 'running'),
  ('A brick weighs 1 kg plus half a brick. How much does the brick weigh?', 'Une brique pèse 1 kg plus une demi-brique. Combien pèse la brique ?', '2 kg', '["1,5 kg", "1 kg", "3 kg"]', 'Une demi-brique pèse 1 kg, donc une brique entière pèse 2 kg.', 2, 'brick'),
  ('How many months of the year have 28 days?', 'Combien de mois de l''année ont 28 jours ?', 'Tous', '["Un", "Deux", "Aucun"]', 'Chaque mois a au moins 28 jours ; seul février n''en a pas plus.', 1, 'birthday-cake'),
  ('You have one match and enter a dark room with a candle, a lamp and a stove. What do you light first?', 'Tu as une allumette et tu entres dans une pièce sombre avec une bougie, une lampe et un poêle. Qu''allumes-tu d''abord ?', 'L''allumette', '["La bougie", "La lampe", "Le poêle"]', 'Rien d''autre ne peut s''allumer tant que l''allumette ne brûle pas.', 1, 'flashlight'),
  ('A rope ladder hangs over a boat''s side, rungs 30 cm apart. The tide rises 90 cm. How many rungs go under?', 'Une échelle de corde pend d''un bateau, barreaux tous les 30 cm. La marée monte de 90 cm. Combien de barreaux sont sous l''eau ?', 'Aucun', '["3", "2", "1"]', 'Le bateau flotte : il monte avec la marée, et l''échelle avec lui.', 2, 'rowboat'),
  ('What number comes next: 2, 6, 12, 20, 30, ?', 'Quel nombre vient ensuite : 2, 6, 12, 20, 30, ?', '42', '["40", "36", "44"]', 'Les écarts augmentent de 2 à chaque fois (4, 6, 8, 10), donc le suivant est 12 : 30 + 12 = 42.', 2, 'calculator'),
  ('A doctor gives you 3 pills and says to take one every half hour. How long do they last?', 'Un médecin te donne 3 comprimés, un toutes les demi-heures. Combien de temps durent-ils ?', '1 heure', '["1,5 heure", "30 minutes", "2 heures"]', 'Un maintenant, un après 30 minutes, un après 60 : trois comprimés, deux intervalles.', 2, 'apple'),
  ('What is half of two, plus two?', 'Combien font la moitié de deux, plus deux ?', '3', '["2", "4", "1"]', 'La moitié de deux fait un, et un plus deux fait trois.', 1, 'coin'),
  ('Tom''s father has three sons: Snap, Crackle and…?', 'Le père de Tom a trois fils : Snap, Crackle et… ?', 'Tom', '["Pop", "Crunch", "Impossible à savoir"]', 'Le père est le père de Tom, donc le troisième fils est Tom.', 1, 'family'),
  ('A box holds 12 apples. You take 3 of them. How many apples do you have?', 'Une boîte contient 12 pommes. Tu en prends 3. Combien de pommes as-tu ?', '3', '["9", "12", "15"]', 'Tu as les trois que tu as prises ; les neuf autres sont dans la boîte.', 1, 'apple'),
  ('Two fathers and two sons go fishing. Each catches one fish, yet only 3 fish are caught. How?', 'Deux pères et deux fils vont pêcher. Chacun prend un poisson, mais il n''y a que 3 poissons. Comment ?', 'Grand-père, père et fils', '["Un poisson a été partagé", "L''un a menti", "C''est impossible"]', 'Trois personnes : celui du milieu est à la fois fils et père, d''où deux pères et deux fils.', 3, 'family'),
  ('8 people build a wall in 10 hours. How long do 4 people take, working at the same pace?', '8 personnes bâtissent un mur en 10 heures. Combien de temps mettent 4 personnes au même rythme ?', '20 heures', '["5 heures", "10 heures", "40 heures"]', 'Moitié moins de monde, deux fois plus de temps : 80 heures-personne dans les deux cas.', 2, 'brick'),
  ('Divide 30 by half and add 10. What do you get?', 'Divise 30 par un demi et ajoute 10. Qu''obtiens-tu ?', '70', '["25", "20", "40"]', 'Diviser par un demi double : 30 ÷ ½ = 60, et 60 + 10 = 70.', 2, 'calculator'),
  ('A shepherd counts 22 legs in his flock, his own included. How many sheep does he have?', 'Un berger compte 22 pattes dans son troupeau, les siennes comprises. Combien a-t-il de moutons ?', '5', '["6", "4", "11"]', 'Retire ses 2 jambes : 20 pattes à 4 par mouton, soit 5 moutons.', 2, 'sheep'),
  ('If today is two days after the day before Friday, what day is it?', 'Si aujourd''hui est deux jours après la veille de vendredi, quel jour est-on ?', 'Samedi', '["Vendredi", "Dimanche", "Jeudi"]', 'La veille de vendredi est jeudi ; deux jours après jeudi, c''est samedi.', 3, 'alarm-clock'),
  ('A train leaves at 8:00 at 60 km/h. A second leaves the same station at 9:00 at 90 km/h. When does it catch up?', 'Un train part à 8h00 à 60 km/h. Un second part de la même gare à 9h00 à 90 km/h. Quand le rattrape-t-il ?', 'À 11h00', '["À 10h00", "À 10h30", "À 12h00"]', 'À 9h00 l''écart est de 60 km et se réduit de 30 km/h, donc il faut 2 heures.', 3, 'running'),
  ('9 coins look identical; one is lighter. With a balance scale, how many weighings find it for sure?', '9 pièces semblent identiques ; une est plus légère. Avec une balance, combien de pesées la trouvent à coup sûr ?', '2', '["3", "4", "1"]', 'Pèse 3 contre 3 pour trouver le groupe léger de 3, puis 1 contre 1 dans ce groupe.', 3, 'weight-scale')
) AS seed(en_text, q, a, w, x, d, icon)
WHERE NOT EXISTS (SELECT 1 FROM public.king_questions WHERE source = 'short-fr-1');

INSERT INTO public.king_questions
  (language, translated_from, question_text, correct_answer, incorrect_answers, explanation, difficulty, source, is_active, icon_slug)
SELECT
  'it',
  (SELECT e.id FROM public.king_questions e
    WHERE e.source = 'short-en-1' AND e.question_text = seed.en_text LIMIT 1),
  seed.q, seed.a, seed.w::jsonb, seed.x, seed.d, 'short-it-1', true, seed.icon
FROM (VALUES
  ('A bat and a ball cost 1.10 together. The bat costs 1.00 more than the ball. What does the ball cost?', 'Una mazza e una palla costano 1,10 insieme. La mazza costa 1,00 più della palla. Quanto costa la palla?', '0,05', '["0,10", "0,15", "1,00"]', 'Se la palla è x, la mazza è x + 1,00, quindi 2x + 1,00 = 1,10 e x = 0,05.', 2, 'baseball'),
  ('5 machines make 5 parts in 5 minutes. How long do 100 machines take to make 100 parts?', '5 macchine fanno 5 pezzi in 5 minuti. Quanto impiegano 100 macchine per 100 pezzi?', '5 minuti', '["100 minuti", "20 minuti", "1 minuto"]', 'Ogni macchina fa un pezzo in 5 minuti, quindi 100 macchine fanno 100 pezzi negli stessi 5 minuti.', 2, 'gear'),
  ('A lily patch doubles every day and covers the whole lake on day 48. On which day did it cover half?', 'Delle ninfee raddoppiano ogni giorno e coprono tutto il lago il giorno 48. In che giorno ne coprivano metà?', 'Il giorno 47', '["Il giorno 24", "Il giorno 46", "Il giorno 12"]', 'Raddoppiano ogni giorno, quindi il giorno prima del lago pieno ne coprivano esattamente metà.', 2, 'lily'),
  ('Which weighs more: a kilogram of feathers or a kilogram of iron?', 'Cosa pesa di più: un chilo di piume o un chilo di ferro?', 'Pesano uguale', '["Il ferro", "Le piume", "Dipende dal volume"]', 'Un chilo è un chilo; le piume occupano solo più spazio.', 1, 'weight-scale'),
  ('A farmer has 17 sheep. All but 9 run away. How many sheep are left?', 'Un contadino ha 17 pecore. Scappano tutte tranne 9. Quante ne restano?', '9', '["8", "17", "26"]', '"Tutte tranne 9" vuol dire che 9 sono rimaste; la trappola è fare 17 meno 9.', 1, 'sheep'),
  ('How many times can you subtract 5 from 25?', 'Quante volte puoi sottrarre 5 da 25?', 'Una volta', '["Cinque volte", "Quattro volte", "Quante vuoi"]', 'Dopo la prima sottrazione hai 20, non 25: da 25 puoi togliere 5 una volta sola.', 1, 'calculator'),
  ('A clock takes 5 seconds to strike 6 o''clock. How long does it take to strike 12?', 'Un orologio impiega 5 secondi a battere le 6. Quanto impiega a battere le 12?', '11 secondi', '["10 secondi", "12 secondi", "6 secondi"]', 'Sei rintocchi hanno cinque pause di un secondo; dodici rintocchi ne hanno undici.', 3, 'alarm-clock'),
  ('In a race you overtake the runner in second place. What place are you in now?', 'In una gara superi chi è secondo. In che posizione sei ora?', 'Secondo', '["Primo", "Terzo", "Dipende"]', 'Hai preso il posto di chi hai superato; il primo è ancora davanti.', 1, 'running'),
  ('A brick weighs 1 kg plus half a brick. How much does the brick weigh?', 'Un mattone pesa 1 kg più mezzo mattone. Quanto pesa il mattone?', '2 kg', '["1,5 kg", "1 kg", "3 kg"]', 'Mezzo mattone pesa 1 kg, quindi uno intero pesa 2 kg.', 2, 'brick'),
  ('How many months of the year have 28 days?', 'Quanti mesi dell''anno hanno 28 giorni?', 'Tutti', '["Uno", "Due", "Nessuno"]', 'Ogni mese ha almeno 28 giorni; solo febbraio non ne ha di più.', 1, 'birthday-cake'),
  ('You have one match and enter a dark room with a candle, a lamp and a stove. What do you light first?', 'Hai un fiammifero ed entri in una stanza buia con una candela, una lampada e una stufa. Cosa accendi per primo?', 'Il fiammifero', '["La candela", "La lampada", "La stufa"]', 'Nient''altro si può accendere finché non si accende il fiammifero.', 1, 'flashlight'),
  ('A rope ladder hangs over a boat''s side, rungs 30 cm apart. The tide rises 90 cm. How many rungs go under?', 'Una scala di corda pende da una barca, pioli ogni 30 cm. La marea sale di 90 cm. Quanti pioli vanno sott''acqua?', 'Nessuno', '["3", "2", "1"]', 'La barca galleggia: sale con la marea, e la scala sale con lei.', 2, 'rowboat'),
  ('What number comes next: 2, 6, 12, 20, 30, ?', 'Che numero viene dopo: 2, 6, 12, 20, 30, ?', '42', '["40", "36", "44"]', 'Le differenze crescono di 2 ogni volta (4, 6, 8, 10), quindi la prossima è 12: 30 + 12 = 42.', 2, 'calculator'),
  ('A doctor gives you 3 pills and says to take one every half hour. How long do they last?', 'Un medico ti dà 3 pastiglie, una ogni mezz''ora. Quanto durano?', '1 ora', '["1,5 ore", "30 minuti", "2 ore"]', 'Una adesso, una dopo 30 minuti, una dopo 60: tre pastiglie, due intervalli.', 2, 'apple'),
  ('What is half of two, plus two?', 'Quanto fa la metà di due, più due?', '3', '["2", "4", "1"]', 'La metà di due è uno, e uno più due fa tre.', 1, 'coin'),
  ('Tom''s father has three sons: Snap, Crackle and…?', 'Il padre di Tom ha tre figli: Snap, Crackle e…?', 'Tom', '["Pop", "Crunch", "Non si può sapere"]', 'Il padre è il padre di Tom, quindi il terzo figlio è Tom.', 1, 'family'),
  ('A box holds 12 apples. You take 3 of them. How many apples do you have?', 'Una cassetta contiene 12 mele. Ne prendi 3. Quante mele hai?', '3', '["9", "12", "15"]', 'Hai le tre che hai preso; le nove rimaste sono nella cassetta.', 1, 'apple'),
  ('Two fathers and two sons go fishing. Each catches one fish, yet only 3 fish are caught. How?', 'Due padri e due figli vanno a pescare. Ognuno prende un pesce, ma i pesci sono solo 3. Come?', 'Nonno, padre e figlio', '["Un pesce è stato diviso", "Uno ha mentito", "È impossibile"]', 'Sono tre persone: quello in mezzo è figlio e padre insieme, quindi due padri e due figli.', 3, 'family'),
  ('8 people build a wall in 10 hours. How long do 4 people take, working at the same pace?', '8 persone costruiscono un muro in 10 ore. Quanto impiegano 4 persone allo stesso ritmo?', '20 ore', '["5 ore", "10 ore", "40 ore"]', 'Metà delle persone, il doppio del tempo: 80 ore-persona in entrambi i casi.', 2, 'brick'),
  ('Divide 30 by half and add 10. What do you get?', 'Dividi 30 per un mezzo e aggiungi 10. Cosa ottieni?', '70', '["25", "20", "40"]', 'Dividere per un mezzo raddoppia: 30 ÷ ½ = 60, e 60 + 10 = 70.', 2, 'calculator'),
  ('A shepherd counts 22 legs in his flock, his own included. How many sheep does he have?', 'Un pastore conta 22 gambe nel suo gregge, comprese le sue. Quante pecore ha?', '5', '["6", "4", "11"]', 'Togli le sue 2 gambe: 20 zampe a 4 per pecora fanno 5 pecore.', 2, 'sheep'),
  ('If today is two days after the day before Friday, what day is it?', 'Se oggi è due giorni dopo il giorno prima di venerdì, che giorno è?', 'Sabato', '["Venerdì", "Domenica", "Giovedì"]', 'Il giorno prima di venerdì è giovedì; due giorni dopo giovedì è sabato.', 3, 'alarm-clock'),
  ('A train leaves at 8:00 at 60 km/h. A second leaves the same station at 9:00 at 90 km/h. When does it catch up?', 'Un treno parte alle 8:00 a 60 km/h. Un secondo parte dalla stessa stazione alle 9:00 a 90 km/h. Quando lo raggiunge?', 'Alle 11:00', '["Alle 10:00", "Alle 10:30", "Alle 12:00"]', 'Alle 9:00 il distacco è di 60 km e si riduce di 30 km/h, quindi servono 2 ore.', 3, 'running'),
  ('9 coins look identical; one is lighter. With a balance scale, how many weighings find it for sure?', '9 monete sembrano uguali; una è più leggera. Con una bilancia a due piatti, quante pesate la trovano di sicuro?', '2', '["3", "4", "1"]', 'Pesa 3 contro 3 per trovare il gruppo leggero di 3, poi 1 contro 1 dentro di esso.', 3, 'weight-scale')
) AS seed(en_text, q, a, w, x, d, icon)
WHERE NOT EXISTS (SELECT 1 FROM public.king_questions WHERE source = 'short-it-1');

INSERT INTO public.king_questions
  (language, translated_from, question_text, correct_answer, incorrect_answers, explanation, difficulty, source, is_active, icon_slug)
SELECT
  'pt',
  (SELECT e.id FROM public.king_questions e
    WHERE e.source = 'short-en-1' AND e.question_text = seed.en_text LIMIT 1),
  seed.q, seed.a, seed.w::jsonb, seed.x, seed.d, 'short-pt-1', true, seed.icon
FROM (VALUES
  ('A bat and a ball cost 1.10 together. The bat costs 1.00 more than the ball. What does the ball cost?', 'Um taco e uma bola custam 1,10 juntos. O taco custa 1,00 a mais que a bola. Quanto custa a bola?', '0,05', '["0,10", "0,15", "1,00"]', 'Se a bola é x, o taco é x + 1,00, logo 2x + 1,00 = 1,10 e x = 0,05.', 2, 'baseball'),
  ('5 machines make 5 parts in 5 minutes. How long do 100 machines take to make 100 parts?', '5 máquinas fazem 5 peças em 5 minutos. Quanto tempo levam 100 máquinas para fazer 100 peças?', '5 minutos', '["100 minutos", "20 minutos", "1 minuto"]', 'Cada máquina faz uma peça em 5 minutos, logo 100 máquinas fazem 100 peças nos mesmos 5 minutos.', 2, 'gear'),
  ('A lily patch doubles every day and covers the whole lake on day 48. On which day did it cover half?', 'Nenúfares dobram todos os dias e cobrem o lago inteiro no dia 48. Em que dia cobriam metade?', 'No dia 47', '["No dia 24", "No dia 46", "No dia 12"]', 'Dobram a cada dia, logo no dia anterior ao lago cheio cobriam exatamente metade.', 2, 'lily'),
  ('Which weighs more: a kilogram of feathers or a kilogram of iron?', 'O que pesa mais: um quilo de penas ou um quilo de ferro?', 'Pesam o mesmo', '["O ferro", "As penas", "Depende do volume"]', 'Um quilo é um quilo; as penas apenas ocupam mais espaço.', 1, 'weight-scale'),
  ('A farmer has 17 sheep. All but 9 run away. How many sheep are left?', 'Um agricultor tem 17 ovelhas. Fogem todas menos 9. Quantas ficam?', '9', '["8", "17", "26"]', '"Todas menos 9" significa que 9 ficaram; a armadilha é fazer 17 menos 9.', 1, 'sheep'),
  ('How many times can you subtract 5 from 25?', 'Quantas vezes podes subtrair 5 de 25?', 'Uma vez', '["Cinco vezes", "Quatro vezes", "As que quiseres"]', 'Depois da primeira subtração tens 20, não 25: só podes tirar 5 de 25 uma vez.', 1, 'calculator'),
  ('A clock takes 5 seconds to strike 6 o''clock. How long does it take to strike 12?', 'Um relógio leva 5 segundos a bater as 6. Quanto tempo leva a bater as 12?', '11 segundos', '["10 segundos", "12 segundos", "6 segundos"]', 'Seis batidas têm cinco pausas de um segundo; doze batidas têm onze.', 3, 'alarm-clock'),
  ('In a race you overtake the runner in second place. What place are you in now?', 'Numa corrida ultrapassas quem vai em segundo. Em que lugar ficas?', 'Segundo', '["Primeiro", "Terceiro", "Depende"]', 'Ficaste com o lugar de quem ultrapassaste; o líder continua à frente.', 1, 'running'),
  ('A brick weighs 1 kg plus half a brick. How much does the brick weigh?', 'Um tijolo pesa 1 kg mais meio tijolo. Quanto pesa o tijolo?', '2 kg', '["1,5 kg", "1 kg", "3 kg"]', 'Meio tijolo pesa 1 kg, logo um tijolo inteiro pesa 2 kg.', 2, 'brick'),
  ('How many months of the year have 28 days?', 'Quantos meses do ano têm 28 dias?', 'Todos', '["Um", "Dois", "Nenhum"]', 'Todos os meses têm pelo menos 28 dias; só fevereiro não tem mais.', 1, 'birthday-cake'),
  ('You have one match and enter a dark room with a candle, a lamp and a stove. What do you light first?', 'Tens um fósforo e entras num quarto escuro com uma vela, um candeeiro e um fogão. O que acendes primeiro?', 'O fósforo', '["A vela", "O candeeiro", "O fogão"]', 'Nada mais se acende antes de o fósforo estar aceso.', 1, 'flashlight'),
  ('A rope ladder hangs over a boat''s side, rungs 30 cm apart. The tide rises 90 cm. How many rungs go under?', 'Uma escada de corda pende de um barco, degraus a cada 30 cm. A maré sobe 90 cm. Quantos degraus ficam submersos?', 'Nenhum', '["3", "2", "1"]', 'O barco flutua: sobe com a maré, e a escada sobe com ele.', 2, 'rowboat'),
  ('What number comes next: 2, 6, 12, 20, 30, ?', 'Que número vem a seguir: 2, 6, 12, 20, 30, ?', '42', '["40", "36", "44"]', 'As diferenças crescem 2 de cada vez (4, 6, 8, 10), logo a próxima é 12: 30 + 12 = 42.', 2, 'calculator'),
  ('A doctor gives you 3 pills and says to take one every half hour. How long do they last?', 'Um médico dá-te 3 comprimidos, um a cada meia hora. Quanto tempo duram?', '1 hora', '["1,5 horas", "30 minutos", "2 horas"]', 'Um agora, outro aos 30 minutos, o terceiro aos 60: três comprimidos, dois intervalos.', 2, 'apple'),
  ('What is half of two, plus two?', 'Quanto é metade de dois, mais dois?', '3', '["2", "4", "1"]', 'Metade de dois é um, e um mais dois é três.', 1, 'coin'),
  ('Tom''s father has three sons: Snap, Crackle and…?', 'O pai do Tomás tem três filhos: Snap, Crackle e…?', 'Tomás', '["Pop", "Crunch", "Não há como saber"]', 'O pai é o pai do Tomás, logo o terceiro filho é o Tomás.', 1, 'family'),
  ('A box holds 12 apples. You take 3 of them. How many apples do you have?', 'Uma caixa tem 12 maçãs. Tiras 3. Quantas maçãs tens?', '3', '["9", "12", "15"]', 'Tens as três que tiraste; as nove restantes ficam na caixa.', 1, 'apple'),
  ('Two fathers and two sons go fishing. Each catches one fish, yet only 3 fish are caught. How?', 'Dois pais e dois filhos vão pescar. Cada um apanha um peixe, mas só há 3 peixes. Como?', 'Avô, pai e filho', '["Um peixe foi partilhado", "Um deles mentiu", "É impossível"]', 'São três pessoas: o do meio é filho e pai ao mesmo tempo, logo dois pais e dois filhos.', 3, 'family'),
  ('8 people build a wall in 10 hours. How long do 4 people take, working at the same pace?', '8 pessoas constroem um muro em 10 horas. Quanto tempo levam 4 pessoas ao mesmo ritmo?', '20 horas', '["5 horas", "10 horas", "40 horas"]', 'Metade das pessoas, o dobro do tempo: 80 horas-pessoa em ambos os casos.', 2, 'brick'),
  ('Divide 30 by half and add 10. What do you get?', 'Divide 30 por meio e soma 10. O que obténs?', '70', '["25", "20", "40"]', 'Dividir por meio duplica: 30 ÷ ½ = 60, e 60 + 10 = 70.', 2, 'calculator'),
  ('A shepherd counts 22 legs in his flock, his own included. How many sheep does he have?', 'Um pastor conta 22 pernas no seu rebanho, incluindo as dele. Quantas ovelhas tem?', '5', '["6", "4", "11"]', 'Tira as 2 pernas dele: 20 patas a 4 por ovelha dão 5 ovelhas.', 2, 'sheep'),
  ('If today is two days after the day before Friday, what day is it?', 'Se hoje é dois dias depois da véspera de sexta-feira, que dia é?', 'Sábado', '["Sexta-feira", "Domingo", "Quinta-feira"]', 'A véspera de sexta é quinta; dois dias depois de quinta é sábado.', 3, 'alarm-clock'),
  ('A train leaves at 8:00 at 60 km/h. A second leaves the same station at 9:00 at 90 km/h. When does it catch up?', 'Um comboio parte às 8:00 a 60 km/h. Outro parte da mesma estação às 9:00 a 90 km/h. Quando o apanha?', 'Às 11:00', '["Às 10:00", "Às 10:30", "Às 12:00"]', 'Às 9:00 a distância é de 60 km e fecha a 30 km/h, logo demora 2 horas.', 3, 'running'),
  ('9 coins look identical; one is lighter. With a balance scale, how many weighings find it for sure?', '9 moedas parecem iguais; uma é mais leve. Com uma balança de pratos, quantas pesagens a encontram de certeza?', '2', '["3", "4", "1"]', 'Pesa 3 contra 3 para achar o grupo leve de 3, depois 1 contra 1 dentro dele.', 3, 'weight-scale')
) AS seed(en_text, q, a, w, x, d, icon)
WHERE NOT EXISTS (SELECT 1 FROM public.king_questions WHERE source = 'short-pt-1');

-- ── the draw prefers short ─────────────────────────────────────────────────

-- "Long" is what does not fit a phone: a question past 150 characters, or
-- any option past 60. Cheap enough to evaluate on every draw over a pool
-- this size.
CREATE OR REPLACE FUNCTION public.king_question_is_long(q public.king_questions)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT length(q.question_text) > 150
      OR length(q.correct_answer) > 60
      OR EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(q.incorrect_answers) a
         WHERE length(a) > 60);
$$;

CREATE OR REPLACE FUNCTION public.king_draw_question(p_match_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_match public.king_matches%ROWTYPE;
  v_question public.king_questions%ROWTYPE;
  v_options jsonb;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_match FROM public.king_matches
   WHERE id = p_match_id AND user_id = v_user FOR UPDATE;
  IF v_match.id IS NULL THEN
    RAISE EXCEPTION 'Match not found';
  END IF;
  IF v_match.status <> 'playing' THEN
    RAISE EXCEPTION 'Match is over';
  END IF;
  IF v_match.current_question_id IS NOT NULL THEN
    -- A remount mid-question resumes it rather than drawing a fresh one.
    RETURN public.king_state(v_match);
  END IF;

  -- Prefer questions this player has never faced in any match; when the
  -- pool is exhausted, allow repeats from other matches rather than dead-end
  -- (this match's own questions stay excluded either way). Short ones
  -- first, in both passes.
  SELECT * INTO v_question FROM public.king_questions q
   WHERE q.is_active AND q.language = v_match.language
     AND q.id <> ALL (v_match.question_ids)
     AND NOT EXISTS (
       SELECT 1 FROM public.king_matches m
        WHERE m.user_id = v_user AND m.id <> v_match.id
          AND q.id = ANY (m.question_ids))
   ORDER BY public.king_question_is_long(q), random() LIMIT 1;

  IF v_question.id IS NULL THEN
    SELECT * INTO v_question FROM public.king_questions q
     WHERE q.is_active AND q.language = v_match.language
       AND q.id <> ALL (v_match.question_ids)
     ORDER BY public.king_question_is_long(q), random() LIMIT 1;
  END IF;

  -- A language with no pool of its own borrows the English one (the
  -- multilang seed's rule), short first as well.
  IF v_question.id IS NULL THEN
    SELECT * INTO v_question FROM public.king_questions q
     WHERE q.is_active AND q.language = 'en'
       AND q.id <> ALL (v_match.question_ids)
     ORDER BY public.king_question_is_long(q), random() LIMIT 1;
  END IF;

  IF v_question.id IS NULL THEN
    RAISE EXCEPTION 'KING_NO_QUESTIONS';
  END IF;

  SELECT jsonb_agg(value ORDER BY random()) INTO v_options
    FROM jsonb_array_elements(
      v_question.incorrect_answers || to_jsonb(ARRAY[v_question.correct_answer]));

  UPDATE public.king_matches
     SET current_question_id = v_question.id,
         drawn_at = now(),
         options_at = NULL,
         options = v_options
   WHERE id = v_match.id
  RETURNING * INTO v_match;

  RETURN public.king_state(v_match);
END;
$$;

REVOKE ALL ON FUNCTION public.king_draw_question(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.king_draw_question(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.king_team_draw_into(p_match public.king_team_matches)
RETURNS public.king_team_matches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_question public.king_questions%ROWTYPE;
  v_match public.king_team_matches%ROWTYPE;
BEGIN
  -- Nobody on the couch has faced it, short first; then the whole pool,
  -- short first; then the English pool for a language without one.
  SELECT * INTO v_question FROM public.king_questions q
   WHERE q.is_active AND q.language = p_match.language
     AND q.id <> ALL (p_match.question_ids)
     AND NOT EXISTS (
       SELECT 1 FROM public.king_matches km
        JOIN public.room_participants rp
          ON rp.user_id = km.user_id AND rp.room_id = p_match.room_id
       WHERE q.id = ANY (km.question_ids))
   ORDER BY public.king_question_is_long(q), random() LIMIT 1;

  IF v_question.id IS NULL THEN
    SELECT * INTO v_question FROM public.king_questions q
     WHERE q.is_active AND q.language = p_match.language
       AND q.id <> ALL (p_match.question_ids)
     ORDER BY public.king_question_is_long(q), random() LIMIT 1;
  END IF;

  IF v_question.id IS NULL THEN
    SELECT * INTO v_question FROM public.king_questions q
     WHERE q.is_active AND q.language = 'en'
       AND q.id <> ALL (p_match.question_ids)
     ORDER BY public.king_question_is_long(q), random() LIMIT 1;
  END IF;

  IF v_question.id IS NULL THEN
    RAISE EXCEPTION 'KING_NO_QUESTIONS';
  END IF;

  UPDATE public.king_team_matches
     SET current_question_id = v_question.id,
         drawn_at = now(),
         options = NULL,
         options_at = NULL,
         suggestions = '{}'::jsonb,
         last_result = NULL,
         updated_at = now()
   WHERE id = p_match.id
  RETURNING * INTO v_match;
  RETURN v_match;
END;
$$;

REVOKE ALL ON FUNCTION public.king_team_draw_into(public.king_team_matches) FROM PUBLIC, anon, authenticated;

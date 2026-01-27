-- Add image_url column to questions table
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL;

-- Create the new "Image Trivia" category
INSERT INTO categories (
  category_id,
  name,
  icon,
  icon_slug,
  color,
  description,
  total_levels,
  type,
  is_active,
  sort_order,
  language,
  is_language_specific
) VALUES (
  'image_trivia',
  'სურათების ტრივია',
  '🖼️',
  'image-gallery',
  'from-pink-500 to-purple-600',
  'გამოიცანი სურათზე რა არის ნაჩვენები',
  1,
  'fun',
  true,
  46,
  'ka',
  false
) ON CONFLICT (category_id) DO NOTHING;

-- Insert 10 initial Image Trivia questions
INSERT INTO questions (
  category_id,
  question_text,
  correct_answer,
  incorrect_answers,
  difficulty,
  level_number,
  is_active,
  in_production,
  language,
  image_url
) VALUES
-- Question 1: Eiffel Tower / Paris
((SELECT id FROM categories WHERE category_id = 'image_trivia'),
 'რომელი ქალაქია?',
 'პარიზი',
 '["ლონდონი", "რომი", "ბერლინი"]',
 'easy', 1, true, true, 'ka',
 'https://images.unsplash.com/photo-1511739001486-6bfe10ce65f4?w=400&q=80'),
 
-- Question 2: Lion
((SELECT id FROM categories WHERE category_id = 'image_trivia'),
 'რომელი ცხოველია?',
 'ლომი',
 '["ვეფხვი", "ჯაგუარი", "ლეოპარდი"]',
 'easy', 1, true, true, 'ka',
 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=400&q=80'),

-- Question 3: Apple
((SELECT id FROM categories WHERE category_id = 'image_trivia'),
 'რა ხილია?',
 'ვაშლი',
 '["მსხალი", "ატამი", "გარგარი"]',
 'easy', 1, true, true, 'ka',
 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&q=80'),

-- Question 4: Statue of Liberty / New York
((SELECT id FROM categories WHERE category_id = 'image_trivia'),
 'რომელი ქალაქია?',
 'ნიუ იორკი',
 '["ლოს ანჯელესი", "ჩიკაგო", "ბოსტონი"]',
 'easy', 1, true, true, 'ka',
 'https://images.unsplash.com/photo-1503174971373-b1f69850bded?w=400&q=80'),

-- Question 5: Elephant
((SELECT id FROM categories WHERE category_id = 'image_trivia'),
 'რომელი ცხოველია?',
 'სპილო',
 '["მარტორქა", "ჰიპოპოტამი", "ჟირაფი"]',
 'easy', 1, true, true, 'ka',
 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=400&q=80'),

-- Question 6: Pizza
((SELECT id FROM categories WHERE category_id = 'image_trivia'),
 'რა კერძია?',
 'პიცა',
 '["ბურგერი", "ხაჭაპური", "ლაზანია"]',
 'easy', 1, true, true, 'ka',
 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80'),

-- Question 7: Colosseum / Rome
((SELECT id FROM categories WHERE category_id = 'image_trivia'),
 'რომელი ქალაქია?',
 'რომი',
 '["ათენი", "პარიზი", "მადრიდი"]',
 'medium', 1, true, true, 'ka',
 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&q=80'),

-- Question 8: Guitar
((SELECT id FROM categories WHERE category_id = 'image_trivia'),
 'რა ინსტრუმენტია?',
 'გიტარა',
 '["ვიოლინო", "უკულელე", "მანდოლინა"]',
 'easy', 1, true, true, 'ka',
 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400&q=80'),

-- Question 9: Sunflower
((SELECT id FROM categories WHERE category_id = 'image_trivia'),
 'რა ყვავილია?',
 'მზესუმზირა',
 '["გერბერა", "ქრიზანთემა", "იასამანი"]',
 'easy', 1, true, true, 'ka',
 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=400&q=80'),

-- Question 10: Mount Fuji / Japan
((SELECT id FROM categories WHERE category_id = 'image_trivia'),
 'რომელი ქვეყანაა?',
 'იაპონია',
 '["ჩინეთი", "კორეა", "ვიეტნამი"]',
 'medium', 1, true, true, 'ka',
 'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=400&q=80');
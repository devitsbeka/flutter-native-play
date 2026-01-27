-- Add video_url and audio_url columns to questions table
ALTER TABLE questions
ADD COLUMN video_url TEXT DEFAULT NULL,
ADD COLUMN audio_url TEXT DEFAULT NULL;

-- Video Trivia category
INSERT INTO categories (
  category_id, name, icon, icon_slug, color, description,
  total_levels, type, is_active, sort_order, language, is_language_specific
) VALUES (
  'video_trivia',
  'ვიდეო ტრივია',
  '🎬',
  'video-camera',
  'from-red-500 to-orange-600',
  'გამოიცანი ვიდეოში რა ხდება',
  1, 'fun', true, 47, 'ka', false
);

-- Sound Trivia category
INSERT INTO categories (
  category_id, name, icon, icon_slug, color, description,
  total_levels, type, is_active, sort_order, language, is_language_specific
) VALUES (
  'sound_trivia',
  'ხმის ტრივია',
  '🎧',
  'headphones',
  'from-blue-500 to-cyan-600',
  'გამოიცანი ხმა რას ეკუთვნის',
  1, 'fun', true, 48, 'ka', false
);
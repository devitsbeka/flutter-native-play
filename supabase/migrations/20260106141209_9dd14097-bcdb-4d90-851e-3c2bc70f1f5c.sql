-- Table for trivia facts
CREATE TABLE public.trivia_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fact_text TEXT NOT NULL,
  source TEXT DEFAULT 'National Geographic',
  image_type TEXT DEFAULT 'whale',
  votes_knew INTEGER DEFAULT 0,
  votes_didnt_know INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Table for user votes (to prevent duplicate voting)
CREATE TABLE public.user_fact_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  fact_id UUID NOT NULL REFERENCES public.trivia_facts(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('knew', 'didnt_know')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, fact_id)
);

-- RLS policies for trivia_facts
ALTER TABLE public.trivia_facts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active facts" ON public.trivia_facts
  FOR SELECT USING (is_active = true);

-- RLS policies for user_fact_votes
ALTER TABLE public.user_fact_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own votes" ON public.user_fact_votes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own votes" ON public.user_fact_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Seed initial facts in Georgian
INSERT INTO public.trivia_facts (fact_text, source, image_type) VALUES
('ლურჯი ვეშაპი ყველაზე დიდი ცხოველია დედამიწაზე და მისი გული მანქანის ზომისაა.', 'National Geographic', 'whale'),
('ადამიანის ტვინი დღეში დაახლოებით 70,000 აზრს ამუშავებს.', 'Scientific American', 'brain'),
('ფუტკარი აღიქვამს ულტრაიისფერ სინათლეს, რომელსაც ადამიანი ვერ ხედავს.', 'Nature Journal', 'bee'),
('ოქტოპუსს სამი გული აქვს და მისი სისხლი ლურჯი ფერისაა.', 'National Geographic', 'octopus'),
('მთვარე ყოველწლიურად 3.8 სანტიმეტრით შორდება დედამიწას.', 'NASA', 'moon');
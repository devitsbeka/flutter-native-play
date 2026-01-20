-- Add draft_type column to trivia_drafts to distinguish between trivia and personal drafts
ALTER TABLE trivia_drafts 
ADD COLUMN IF NOT EXISTS draft_type TEXT DEFAULT 'trivia';

-- Add a check constraint
ALTER TABLE trivia_drafts 
ADD CONSTRAINT trivia_drafts_draft_type_check 
CHECK (draft_type IN ('trivia', 'personal'));
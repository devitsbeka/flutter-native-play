-- Create icon assignment history table
CREATE TABLE public.icon_assignment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES public.questions(id) ON DELETE CASCADE,
  question_text text,
  old_icon_slug text,
  new_icon_slug text,
  assignment_method text NOT NULL,
  category_id uuid,
  category_name text,
  assigned_by uuid,
  assigned_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.icon_assignment_history ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can view icon assignment history"
ON public.icon_assignment_history FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert icon assignment history"
ON public.icon_assignment_history FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete icon assignment history"
ON public.icon_assignment_history FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for fast queries
CREATE INDEX idx_icon_assignment_history_date ON public.icon_assignment_history(assigned_at DESC);
CREATE INDEX idx_icon_assignment_history_category ON public.icon_assignment_history(category_id);
CREATE INDEX idx_icon_assignment_history_method ON public.icon_assignment_history(assignment_method);
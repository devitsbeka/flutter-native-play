-- Saved social frames: the admin picks a question + canvas on /admin/social,
-- saves it, and later posts it immediately or on a schedule through the
-- social-post edge function (which talks to the Late API). The row stores the
-- frame's options and a snapshot of the question, so a draft renders the same
-- even if the pool row is later edited or retired.
--
-- Admin-only on every verb: these rows drive outbound posts on the brand's
-- accounts, so no player-facing policy exists at all.

CREATE TABLE public.social_frame_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Frame options
  language text NOT NULL,
  format_key text NOT NULL,
  w integer NOT NULL,
  h integer NOT NULL,
  reveal boolean NOT NULL DEFAULT false,

  -- Question snapshot (id, question_text, correct_answer, icon_slug,
  -- answers in their seeded order, category_key), so rendering never
  -- depends on the live pool row.
  question_id uuid,
  payload jsonb NOT NULL,

  -- Posting
  caption text NOT NULL DEFAULT '',
  platforms text[] NOT NULL DEFAULT '{instagram}',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'posted', 'failed')),
  scheduled_for timestamptz,
  posted_at timestamptz,
  late_post_id text,
  platform_post_url text,
  last_error text
);

ALTER TABLE public.social_frame_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage social frame drafts"
  ON public.social_frame_drafts
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER social_frame_drafts_updated_at
  BEFORE UPDATE ON public.social_frame_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

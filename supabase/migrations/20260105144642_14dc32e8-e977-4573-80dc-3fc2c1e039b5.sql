-- Create user_reports table for content moderation
CREATE TABLE public.user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  reported_user_id uuid NOT NULL,
  report_type text NOT NULL CHECK (report_type IN ('spam', 'harassment', 'inappropriate', 'cheating', 'other')),
  message_id uuid,
  room_id uuid,
  description text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

-- Create user_blocks table
CREATE TABLE public.user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_reports
CREATE POLICY "Users can create reports" ON public.user_reports
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports" ON public.user_reports
  FOR SELECT TO authenticated 
  USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports" ON public.user_reports
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reports" ON public.user_reports
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_blocks
CREATE POLICY "Users can manage their blocks" ON public.user_blocks
  FOR ALL TO authenticated 
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users can check if they are blocked" ON public.user_blocks
  FOR SELECT TO authenticated 
  USING (auth.uid() = blocked_id);

-- Add columns to vip_subscriptions for Apple receipt tracking
ALTER TABLE public.vip_subscriptions 
  ADD COLUMN IF NOT EXISTS apple_original_transaction_id text,
  ADD COLUMN IF NOT EXISTS apple_product_id text,
  ADD COLUMN IF NOT EXISTS purchase_platform text DEFAULT 'ios';
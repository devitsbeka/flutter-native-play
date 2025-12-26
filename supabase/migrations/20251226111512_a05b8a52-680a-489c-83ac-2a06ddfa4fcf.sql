-- Game invitations table for friend-to-friend game requests
CREATE TABLE public.game_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.game_rooms(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone DEFAULT (now() + interval '5 minutes') NOT NULL
);

-- Enable Row-Level Security
ALTER TABLE public.game_invitations ENABLE ROW LEVEL SECURITY;

-- Users can view invitations they sent or received
CREATE POLICY "Users can view their invitations"
ON public.game_invitations
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can send invitations
CREATE POLICY "Users can send invitations"
ON public.game_invitations
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Users can update invitations they received (to accept/decline)
CREATE POLICY "Users can respond to invitations"
ON public.game_invitations
FOR UPDATE
USING (auth.uid() = receiver_id);

-- Sender can delete their own invitations
CREATE POLICY "Users can cancel their invitations"
ON public.game_invitations
FOR DELETE
USING (auth.uid() = sender_id);

-- Create indexes for faster lookups
CREATE INDEX idx_game_invitations_receiver ON public.game_invitations (receiver_id, status);
CREATE INDEX idx_game_invitations_sender ON public.game_invitations (sender_id);
CREATE INDEX idx_game_invitations_expires ON public.game_invitations (expires_at);

-- Enable realtime for game invitations
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_invitations;
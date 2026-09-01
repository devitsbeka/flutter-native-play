-- Promotions: the offer strip on the V3 home (src/features/home-v3).
--
-- The strip used to carry its label and its end date in the bundle, which
-- meant a deploy to change an offer and a stale one on every phone that had
-- not updated. Now it reads the one live row here: the label in every
-- language the app ships, when it starts, when it ends. No live row, no
-- strip.
--
-- Readable by everyone (anon included) but only while live — a scheduled or
-- expired row is not visible to a client at all, so nothing has to be hidden
-- on the client's side. Written only by admins.

CREATE TABLE IF NOT EXISTS public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- {"en": "Autumn Offer", "ka": "შემოდგომის შეთავაზება", ...}. The client
  -- picks its language and falls back to English.
  label jsonb NOT NULL,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT promotions_ends_after_start CHECK (ends_at > starts_at),
  CONSTRAINT promotions_label_has_english CHECK (label ? 'en')
);

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read a live promotion" ON public.promotions;
CREATE POLICY "Anyone can read a live promotion"
ON public.promotions FOR SELECT
USING (active AND starts_at <= now() AND ends_at > now());

DROP POLICY IF EXISTS "Admins manage promotions" ON public.promotions;
CREATE POLICY "Admins manage promotions"
ON public.promotions FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS promotions_live_idx ON public.promotions (ends_at) WHERE active;

-- The first offer, the one the strip shipped with.
INSERT INTO public.promotions (label, starts_at, ends_at)
VALUES (
  '{"en": "Autumn Offer", "ka": "შემოდგომის შეთავაზება", "es": "Oferta de otoño", "fr": "Offre d''automne", "de": "Herbstangebot", "it": "Offerta d''autunno", "pt": "Oferta de outono"}'::jsonb,
  now(),
  '2026-09-30T23:59:59+04:00'
);

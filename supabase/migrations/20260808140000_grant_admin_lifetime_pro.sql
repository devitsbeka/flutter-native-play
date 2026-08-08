-- Grant lifetime PRO to admin accounts.
-- "Lifetime" is a far-future concrete date rather than 'infinity' because the
-- client parses expires_at with new Date(), which can't handle 'infinity'.
INSERT INTO public.vip_subscriptions (user_id, vip_tier, expires_at, auto_renew, purchase_platform)
SELECT ur.user_id, 'pro', '2126-01-01T00:00:00Z', false, 'admin_grant'
FROM public.user_roles ur
WHERE ur.role = 'admin'
ON CONFLICT (user_id) DO UPDATE
SET vip_tier = 'pro',
    expires_at = '2126-01-01T00:00:00Z',
    updated_at = now();

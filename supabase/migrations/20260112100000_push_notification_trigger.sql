-- Enable pg_net extension for HTTP requests from database triggers
-- Note: pg_net is already enabled on Supabase by default
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA net;

-- Function to send push notification when a notification is created
CREATE OR REPLACE FUNCTION public.send_push_on_notification_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  request_id BIGINT;
  supabase_url TEXT;
  service_key TEXT;
BEGIN
  -- Skip certain notification types that don't need push
  IF NEW.type IN ('system', 'achievement_unlocked') THEN
    RETURN NEW;
  END IF;
  
  -- Get Supabase URL from environment
  -- On Supabase hosted, these are available via vault or settings
  supabase_url := COALESCE(
    current_setting('app.settings.supabase_url', true),
    current_setting('supabase.url', true)
  );
  
  service_key := COALESCE(
    current_setting('app.settings.service_role_key', true),
    current_setting('supabase.service_role_key', true)
  );
  
  -- If settings not available, skip (will be logged)
  IF supabase_url IS NULL OR service_key IS NULL THEN
    RAISE WARNING 'Push notification skipped: supabase_url or service_key not configured';
    RETURN NEW;
  END IF;
  
  -- Make async HTTP request to edge function using pg_net
  SELECT net.http_post(
    url := supabase_url || '/functions/v1/trigger-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    )::jsonb,
    body := jsonb_build_object(
      'user_id', NEW.user_id::text,
      'title', NEW.title,
      'body', NEW.message,
      'type', NEW.type,
      'data', COALESCE(NEW.data, '{}'::jsonb)
    )::jsonb
  ) INTO request_id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail the notification insert if push fails
    RAISE WARNING 'Failed to queue push notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger on notifications table
DROP TRIGGER IF EXISTS trigger_push_on_notification ON notifications;
CREATE TRIGGER trigger_push_on_notification
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION send_push_on_notification_insert();

-- Add comment explaining the trigger
COMMENT ON FUNCTION public.send_push_on_notification_insert() IS 
'Sends a push notification via edge function when a new notification is inserted.
Requires database settings: app.settings.supabase_url and app.settings.service_role_key.
Set via Supabase Dashboard > Database > Database Settings > Connection Pooling > Custom PostgreSQL parameters.';

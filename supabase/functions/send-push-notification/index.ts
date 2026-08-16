import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
// One FCM implementation, in _shared. This file used to carry its own copy of
// the service-account signing and the messages:send call; a second caller
// (send-game-invite-push) made that a fork waiting to happen.
import { sendToUsers } from "../_shared/push.ts";

interface PushNotificationRequest {
  user_ids?: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  notification_type: 'game_invite' | 'daily_reward' | 'friend_request' | 'game_started' | 'custom';
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { user_ids, title, body, data, notification_type } = await req.json() as PushNotificationRequest;

    console.log(`Sending ${notification_type} notification to ${user_ids?.length || 'all'} users`);

    // Recipients: an explicit list, or everyone with a registered device.
    let targetIds = user_ids;
    if (!targetIds || targetIds.length === 0) {
      const { data: all, error: allError } = await supabase
        .from('push_tokens')
        .select('user_id');
      if (allError) {
        console.error('Error fetching tokens:', allError);
        return new Response(JSON.stringify({ error: 'Failed to fetch push tokens' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      targetIds = [...new Set((all ?? []).map((r: { user_id: string }) => r.user_id))];
    }

    if (targetIds.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: 'No push tokens found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { sent: successfulCount, failed: failedCount } = await sendToUsers(
      supabase,
      targetIds,
      title,
      body,
      { ...data, type: notification_type },
    );

    // Log notification in database
    {
      await Promise.all(
        targetIds.map((userId: string) =>
          supabase.from('notifications').insert({
            user_id: userId,
            type: notification_type,
            title,
            message: body,
            data: data || {}
          })
        )
      );
    }

    console.log(`Sent ${successfulCount} notifications, ${failedCount} failed`);

    return new Response(JSON.stringify({
      success: true,
      sent: successfulCount,
      failed: failedCount,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in send-push-notification:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

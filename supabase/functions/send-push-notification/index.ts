import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

interface PushNotificationRequest {
  user_ids?: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  notification_type: 'game_invite' | 'daily_reward' | 'friend_request' | 'game_started' | 'custom';
}

// Get FCM access token using service account
async function getFCMAccessToken(): Promise<string> {
  const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
  if (!serviceAccountJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT not configured');
  }

  const serviceAccount = JSON.parse(serviceAccountJson);
  
  // Create JWT for FCM
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging'
  };

  // Base64URL encode
  const base64UrlEncode = (obj: object) => {
    const json = JSON.stringify(obj);
    const base64 = btoa(json);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  const unsignedToken = `${base64UrlEncode(header)}.${base64UrlEncode(payload)}`;
  
  // Import private key and sign
  const pemContents = serviceAccount.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\n/g, '');
  
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(unsignedToken)
  );
  
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  const jwt = `${unsignedToken}.${signatureBase64}`;
  
  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });
  
  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    console.error('Token response:', tokenData);
    throw new Error('Failed to get FCM access token');
  }
  
  return tokenData.access_token;
}

async function sendFCMNotification(
  accessToken: string,
  projectId: string,
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  try {
    const message: Record<string, unknown> = {
      message: {
        token,
        notification: {
          title,
          body,
        },
        apns: {
          payload: {
            aps: {
              alert: { title, body },
              sound: 'default',
              badge: 1,
            }
          }
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'game_notifications'
          }
        }
      }
    };

    if (data) {
      (message.message as Record<string, unknown>).data = data;
    }

    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('FCM error:', errorData);
      return { success: false, error: JSON.stringify(errorData) };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Error sending FCM notification:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
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

    // Get FCM access token.
    //
    // Checked here rather than trusting the `!`: with the secret unset this
    // was JSON.parse(undefined), which throws 'SyntaxError: "undefined" is
    // not valid JSON' and reaches the caller as a 500 that names neither the
    // secret nor the fact that it is missing. getFCMAccessToken has the clear
    // message, but it is called two lines later and never got the chance.
    const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    if (!serviceAccountJson) {
      console.error('FIREBASE_SERVICE_ACCOUNT is not set; cannot send');
      return new Response(
        JSON.stringify({ error: 'FIREBASE_SERVICE_ACCOUNT not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let projectId: string;
    try {
      projectId = JSON.parse(serviceAccountJson).project_id;
      if (!projectId) throw new Error('no project_id in FIREBASE_SERVICE_ACCOUNT');
    } catch (e) {
      console.error('FIREBASE_SERVICE_ACCOUNT is not usable JSON:', e);
      return new Response(
        JSON.stringify({ error: 'FIREBASE_SERVICE_ACCOUNT is malformed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    
    const accessToken = await getFCMAccessToken();

    // Get push tokens
    let query = supabase.from('push_tokens').select('user_id, token, platform');
    
    if (user_ids && user_ids.length > 0) {
      query = query.in('user_id', user_ids);
    }

    const { data: tokens, error: tokensError } = await query;

    if (tokensError) {
      console.error('Error fetching tokens:', tokensError);
      return new Response(JSON.stringify({ error: 'Failed to fetch push tokens' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        sent: 0, 
        message: 'No push tokens found' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${tokens.length} push tokens`);

    // Send notifications
    const results = await Promise.all(
      tokens.map(({ token: pushToken }) =>
        sendFCMNotification(
          accessToken,
          projectId,
          pushToken,
          title,
          body,
          { ...data, type: notification_type }
        )
      )
    );

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success);

    // Log notification in database
    if (user_ids && user_ids.length > 0) {
      await Promise.all(
        user_ids.map(userId =>
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

    console.log(`Sent ${successful}/${tokens.length} notifications successfully`);

    return new Response(JSON.stringify({ 
      success: true,
      sent: successful,
      failed: failed.length,
      errors: failed.map(f => f.error)
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

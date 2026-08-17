import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// Firebase Cloud Messaging access token generation
async function getFCMAccessToken(): Promise<string> {
  const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!serviceAccountJson) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT environment variable is not set");
  }

  const serviceAccount = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const signatureInput = encoder.encode(`${headerB64}.${payloadB64}`);

  const privateKeyPem = serviceAccount.private_key;
  const pemContents = privateKeyPem.replace(/-----BEGIN PRIVATE KEY-----/, "").replace(/-----END PRIVATE KEY-----/, "").replace(/\s/g, "");
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, signatureInput);
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const jwt = `${headerB64}.${payloadB64}.${signatureB64}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`);
  }

  return tokenData.access_token;
}

// Send FCM notification
async function sendFCMNotification(
  token: string,
  title: string,
  body: string,
  data: Record<string, string>,
  accessToken: string,
  projectId: string
): Promise<boolean> {
  try {
    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          data,
          android: {
            priority: "high",
            notification: {
              sound: "default",
              channel_id: "high_importance_channel",
            },
          },
          apns: {
            payload: {
              aps: {
                sound: "default",
                badge: 1,
              },
            },
          },
        },
      }),
    });

    const result = await response.json();
    console.log(`FCM send result for token ${token.substring(0, 20)}...:`, response.ok ? "success" : result);
    return response.ok;
  } catch (error) {
    console.error("Error sending FCM notification:", error);
    return false;
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting new levels notification check...");

    // Get all categories with their current total_levels
    const { data: categories, error: catError } = await supabase
      .from("categories")
      .select("id, category_id, name, total_levels");

    if (catError) {
      console.error("Error fetching categories:", catError);
      throw catError;
    }

    console.log(`Found ${categories?.length || 0} categories`);

    // Find users who have played these categories and have outdated last_seen_total_levels
    const usersToNotify: Map<string, { categoryId: string; categoryUuid: string; categoryName: string; newLevels: number }[]> = new Map();

    for (const category of categories || []) {
      // Find users whose last_seen_total_levels < current total_levels
      const { data: outdatedUsers, error: outdatedError } = await supabase
        .from("user_category_last_seen")
        .select("user_id, last_seen_total_levels")
        .eq("category_id", category.id)
        .lt("last_seen_total_levels", category.total_levels);

      if (outdatedError) {
        console.error(`Error checking users for category ${category.name}:`, outdatedError);
        continue;
      }

      for (const record of outdatedUsers || []) {
        const newLevelCount = category.total_levels - record.last_seen_total_levels;
        if (newLevelCount > 0) {
          const existing = usersToNotify.get(record.user_id) || [];
          existing.push({
            categoryId: category.category_id || category.id,
            categoryUuid: category.id,
            categoryName: category.name,
            newLevels: newLevelCount,
          });
          usersToNotify.set(record.user_id, existing);
        }
      }
    }

    console.log(`Found ${usersToNotify.size} users with new levels to notify`);

    if (usersToNotify.size === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No users to notify", notified: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get FCM access token
    const accessToken = await getFCMAccessToken();
    const projectId = JSON.parse(Deno.env.get("FIREBASE_SERVICE_ACCOUNT") || "{}").project_id;

    if (!projectId) {
      throw new Error("Could not extract project_id from FIREBASE_SERVICE_ACCOUNT");
    }

    let notificationsSent = 0;
    const userIds = Array.from(usersToNotify.keys());

    // Get push tokens for all users to notify
    const { data: pushTokens, error: tokensError } = await supabase
      .from("push_tokens")
      .select("user_id, token")
      .in("user_id", userIds);

    if (tokensError) {
      console.error("Error fetching push tokens:", tokensError);
      throw tokensError;
    }

    console.log(`Found ${pushTokens?.length || 0} push tokens for ${userIds.length} users`);

    // Each push is composed in its RECIPIENT's app language
    // (profiles.preferred_language, default 'ka').
    const { data: langRows } = await supabase
      .from("profiles")
      .select("user_id, preferred_language")
      .in("user_id", userIds);
    const langByUser = new Map<string, string>(
      (langRows || []).map((r: { user_id: string; preferred_language: string | null }) => [
        r.user_id,
        r.preferred_language || "ka",
      ]),
    );

    // The interpolated category name must be in the recipient's language too:
    // categories.name is the Georgian name; per-language names live in
    // category_translations. Without this an English push read
    // '1 new level added to "მეცნიერება"!'.
    const langsInPlay = [...new Set([...langByUser.values()])].filter((l) => l !== "ka");
    const nameByLangAndUuid = new Map<string, string>();
    if (langsInPlay.length > 0) {
      const { data: catTrans } = await supabase
        .from("category_translations")
        .select("category_id, language, name")
        .in("language", langsInPlay);
      for (const row of catTrans || []) {
        if (row.name) nameByLangAndUuid.set(`${row.language}:${row.category_id}`, row.name);
      }
    }

    const MESSAGES: Record<string, { title: string; one: (cat: string, n: number) => string; many: (count: number) => string }> = {
      ka: {
        title: "🎮 ახალი დონეები!",
        one: (cat, n) => `კატეგორიაში "${cat}" ${n} ახალი დონე დაემატა! გააგრძელე თამაში.`,
        many: (count) => `${count} კატეგორიაში ახალი დონეები დაემატა! გააგრძელე თამაში.`,
      },
      en: {
        title: "🎮 New levels!",
        one: (cat, n) => `${n} new level${n === 1 ? "" : "s"} added to "${cat}"! Keep playing.`,
        many: (count) => `New levels added in ${count} categories! Keep playing.`,
      },
      de: {
        title: "🎮 Neue Level!",
        one: (cat, n) => `${n} neue${n === 1 ? "s" : ""} Level in „${cat}“! Spiel weiter.`,
        many: (count) => `Neue Level in ${count} Kategorien! Spiel weiter.`,
      },
      es: {
        title: "🎮 ¡Nuevos niveles!",
        one: (cat, n) => `¡${n} nivel${n === 1 ? "" : "es"} nuevo${n === 1 ? "" : "s"} en "${cat}"! Sigue jugando.`,
        many: (count) => `¡Nuevos niveles en ${count} categorías! Sigue jugando.`,
      },
      fr: {
        title: "🎮 Nouveaux niveaux !",
        one: (cat, n) => `${n} nouveau${n === 1 ? "" : "x"} niveau${n === 1 ? "" : "x"} dans « ${cat} » ! Continue à jouer.`,
        many: (count) => `Nouveaux niveaux dans ${count} catégories ! Continue à jouer.`,
      },
      it: {
        title: "🎮 Nuovi livelli!",
        one: (cat, n) => `${n} nuov${n === 1 ? "o livello" : "i livelli"} in "${cat}"! Continua a giocare.`,
        many: (count) => `Nuovi livelli in ${count} categorie! Continua a giocare.`,
      },
      pt: {
        title: "🎮 Novos níveis!",
        one: (cat, n) => `${n} ${n === 1 ? "novo nível" : "novos níveis"} em "${cat}"! Continue jogando.`,
        many: (count) => `Novos níveis em ${count} categorias! Continue jogando.`,
      },
    };

    // Send notifications
    for (const tokenRecord of pushTokens || []) {
      const userCategories = usersToNotify.get(tokenRecord.user_id);
      if (!userCategories || userCategories.length === 0) continue;

      // Create notification message
      const primaryCategory = userCategories[0];
      const userLang = langByUser.get(tokenRecord.user_id) || "ka";
      const msg = MESSAGES[userLang] ?? MESSAGES.ka;
      const title = msg.title;
      const localizedName =
        nameByLangAndUuid.get(`${userLang}:${primaryCategory.categoryUuid}`) ||
        primaryCategory.categoryName;
      const body = userCategories.length === 1
        ? msg.one(localizedName, primaryCategory.newLevels)
        : msg.many(userCategories.length);

      const data = {
        type: "new_levels",
        category_id: primaryCategory.categoryId,
        deep_link: `/category/${primaryCategory.categoryId}`,
      };

      const success = await sendFCMNotification(
        tokenRecord.token,
        title,
        body,
        data,
        accessToken,
        projectId
      );

      if (success) {
        notificationsSent++;

        // Log notification to database
        await supabase.from("notifications").insert({
          user_id: tokenRecord.user_id,
          type: "new_levels",
          title,
          message: body,
          data: { categories: userCategories },
        });

        // Update last_notified_at for all categories the user was notified about
        for (const cat of userCategories) {
          await supabase
            .from("user_category_last_seen")
            .update({ last_notified_at: new Date().toISOString() })
            .eq("user_id", tokenRecord.user_id)
            .eq("category_id", cat.categoryId);
        }
      }
    }

    console.log(`Successfully sent ${notificationsSent} notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${notificationsSent} notifications`,
        notified: notificationsSent,
        usersChecked: usersToNotify.size,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in notify-new-levels function:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
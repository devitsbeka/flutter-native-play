import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * social-post — publishes a saved social frame through the Late API.
 *
 * The browser renders the frame to a PNG (it has the components and the
 * fonts); this function holds the LATE_API_KEY secret, uploads the image,
 * and creates the post — immediately (publishNow) or scheduled
 * (scheduledFor, UTC). Late runs the schedule itself, so nothing here needs
 * a cron.
 *
 * Admin-only: posts go out on the brand's connected accounts.
 *
 * Body: {
 *   draftId?: string,        // social_frame_drafts row to update with the outcome
 *   imageBase64: string,     // the rendered frame, PNG, no data: prefix
 *   caption: string,
 *   platforms: string[],     // subset of ["instagram", "facebook"]
 *   scheduledFor?: string,   // RFC3339; omitted = publish now
 *   altText?: string,
 * }
 *
 * Secrets: LATE_API_KEY (Supabase platform secret — never in the client).
 */

const LATE_API = "https://getlate.dev/api/v1";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin authorization (same pattern as send-push-notification)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Unauthorized" });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json(401, { error: "Unauthorized" });

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();
    if (!roleData) return json(403, { error: "Admin access required" });

    const lateKey = Deno.env.get("LATE_API_KEY");
    if (!lateKey) {
      return json(500, {
        error: "LATE_API_KEY is not configured as a Supabase secret",
      });
    }

    const { draftId, imageBase64, caption, platforms, scheduledFor, altText } =
      await req.json();

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return json(400, { error: "imageBase64 is required" });
    }
    const wanted: string[] = Array.isArray(platforms) && platforms.length
      ? platforms
      : ["instagram"];

    const fail = async (status: number, error: string) => {
      if (draftId) {
        await supabase
          .from("social_frame_drafts")
          .update({ status: "failed", last_error: error })
          .eq("id", draftId);
      }
      return json(status, { error });
    };

    // Resolve platform -> connected account id
    const accountsRes = await fetch(`${LATE_API}/accounts`, {
      headers: { Authorization: `Bearer ${lateKey}` },
    });
    if (!accountsRes.ok) {
      return await fail(502, `Late /accounts failed: HTTP ${accountsRes.status}`);
    }
    const { accounts } = await accountsRes.json();
    const targets = wanted
      .map((p) => {
        const acc = (accounts ?? []).find(
          (a: { platform: string; _id: string }) => a.platform === p,
        );
        return acc ? { platform: p, accountId: acc._id } : null;
      })
      .filter(Boolean);
    if (targets.length === 0) {
      return await fail(400, `No connected Late account for: ${wanted.join(", ")}`);
    }

    // Upload the rendered frame
    const bytes = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0));
    const form = new FormData();
    form.append("file", new Blob([bytes], { type: "image/png" }), "frame.png");
    const uploadRes = await fetch(`${LATE_API}/media/upload-direct`, {
      method: "POST",
      headers: { Authorization: `Bearer ${lateKey}` },
      body: form,
    });
    if (!uploadRes.ok) {
      return await fail(502, `Late media upload failed: HTTP ${uploadRes.status}`);
    }
    const { url: mediaUrl } = await uploadRes.json();

    // Create the post
    const postBody: Record<string, unknown> = {
      content: caption ?? "",
      mediaItems: [
        {
          type: "image",
          url: mediaUrl,
          filename: "frame.png",
          mimeType: "image/png",
          ...(altText ? { altText } : {}),
        },
      ],
      platforms: targets,
      timezone: "UTC",
      ...(scheduledFor ? { scheduledFor } : { publishNow: true }),
    };
    const postRes = await fetch(`${LATE_API}/posts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lateKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postBody),
    });
    const postJson = await postRes.json().catch(() => ({}));
    if (!postRes.ok) {
      return await fail(
        502,
        `Late post failed: HTTP ${postRes.status} ${JSON.stringify(postJson).slice(0, 300)}`,
      );
    }

    const latePostId = postJson.post?._id ?? null;
    if (draftId) {
      await supabase
        .from("social_frame_drafts")
        .update(
          scheduledFor
            ? {
              status: "scheduled",
              scheduled_for: scheduledFor,
              late_post_id: latePostId,
              last_error: null,
            }
            : {
              status: "posted",
              posted_at: new Date().toISOString(),
              late_post_id: latePostId,
              last_error: null,
            },
        )
        .eq("id", draftId);
    }

    return json(200, {
      ok: true,
      latePostId,
      scheduled: Boolean(scheduledFor),
      post: postJson.post ?? null,
    });
  } catch (e) {
    console.error("[social-post]", e);
    return json(500, { error: e instanceof Error ? e.message : "Internal error" });
  }
});

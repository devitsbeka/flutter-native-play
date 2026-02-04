import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple hash function for security answers (using Web Crypto API)
async function hashAnswer(answer: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(answer.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, username, answer, new_password } = await req.json();

    // Convert username to pseudo-email format (matching signUpWithUsername)
    const pseudoEmail = `${username.toLowerCase().replace(/[^a-z0-9]/g, "")}@mytrivia.local`;

    // Action: Get security question for a username
    if (action === "get-question") {
      // Find user by email
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        return new Response(
          JSON.stringify({ error: "Failed to lookup user" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const user = authData.users.find(u => u.email === pseudoEmail);
      
      if (!user) {
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get profile with security question
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("security_question_id, security_answer_hash")
        .eq("user_id", user.id)
        .single();

      if (profileError || !profile) {
        return new Response(
          JSON.stringify({ error: "Profile not found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!profile.security_question_id) {
        return new Response(
          JSON.stringify({ error: "No security question set", security_question_id: null }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check rate limiting (3 attempts per hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("password_reset_attempts")
        .select("*", { count: "exact", head: true })
        .eq("username", username.toLowerCase())
        .gte("attempted_at", oneHourAgo)
        .eq("success", false);

      const attemptsRemaining = Math.max(0, 3 - (count || 0));

      if (attemptsRemaining === 0) {
        return new Response(
          JSON.stringify({ error: "Too many attempts. Try again later.", attempts_remaining: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ 
          security_question_id: profile.security_question_id,
          attempts_remaining: attemptsRemaining,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Verify security answer
    if (action === "verify-answer") {
      // Find user
      const { data: authData } = await supabase.auth.admin.listUsers();
      const user = authData?.users.find(u => u.email === pseudoEmail);
      
      if (!user) {
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check rate limiting
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("password_reset_attempts")
        .select("*", { count: "exact", head: true })
        .eq("username", username.toLowerCase())
        .gte("attempted_at", oneHourAgo)
        .eq("success", false);

      const attemptsRemaining = Math.max(0, 3 - (count || 0));

      if (attemptsRemaining === 0) {
        return new Response(
          JSON.stringify({ error: "Too many attempts. Try again later.", attempts_remaining: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get stored answer hash
      const { data: profile } = await supabase
        .from("profiles")
        .select("security_answer_hash")
        .eq("user_id", user.id)
        .single();

      if (!profile?.security_answer_hash) {
        return new Response(
          JSON.stringify({ error: "No security answer set" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Hash the provided answer and compare
      const providedHash = await hashAnswer(answer);
      const isCorrect = providedHash === profile.security_answer_hash;

      // Record attempt
      await supabase.from("password_reset_attempts").insert({
        username: username.toLowerCase(),
        success: isCorrect,
      });

      if (!isCorrect) {
        return new Response(
          JSON.stringify({ 
            error: "Incorrect answer", 
            verified: false,
            attempts_remaining: attemptsRemaining - 1,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ verified: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Reset password
    if (action === "reset-password") {
      // First verify the answer again (prevent bypass)
      const { data: authData } = await supabase.auth.admin.listUsers();
      const user = authData?.users.find(u => u.email === pseudoEmail);
      
      if (!user) {
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify answer
      const { data: profile } = await supabase
        .from("profiles")
        .select("security_answer_hash")
        .eq("user_id", user.id)
        .single();

      const providedHash = await hashAnswer(answer);
      if (providedHash !== profile?.security_answer_hash) {
        return new Response(
          JSON.stringify({ error: "Invalid verification" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update password using admin API
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: new_password }
      );

      if (updateError) {
        return new Response(
          JSON.stringify({ error: "Failed to update password: " + updateError.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Record successful reset
      await supabase.from("password_reset_attempts").insert({
        username: username.toLowerCase(),
        success: true,
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Hash answer (for signup - store hashed answer)
    if (action === "hash-answer") {
      const hashedAnswer = await hashAnswer(answer);
      return new Response(
        JSON.stringify({ hash: hashedAnswer }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

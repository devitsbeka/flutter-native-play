import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_my_progress",
  title: "Get my category progress",
  description: "Return the signed-in player's per-category progress: questions answered, correct, and completion.",
  inputSchema: {
    category_id: z.string().optional().describe("Restrict the result to one category id."),
    limit: z.number().int().optional().describe("Maximum rows to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ category_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("user_category_progress")
      .select("category_id, questions_answered, questions_correct, completed, completed_at, updated_at")
      .eq("user_id", ctx.getUserId())
      .order("updated_at", { ascending: false })
      .limit(Math.min(Math.max(limit ?? 50, 1), 200));

    if (category_id) query = query.eq("category_id", category_id);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { progress: data ?? [] },
    };
  },
});

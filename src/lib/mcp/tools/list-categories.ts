import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_categories",
  title: "List trivia categories",
  description: "List active trivia categories, optionally filtered by language or a name search.",
  inputSchema: {
    language: z.string().optional().describe("Language code such as 'en' or 'ka'."),
    search: z.string().optional().describe("Case-insensitive substring of the category name."),
    limit: z.number().int().optional().describe("Maximum number of categories to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ language, search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("categories")
      .select("id, name, description, language, type, total_levels, is_active")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(Math.min(Math.max(limit ?? 50, 1), 200));

    if (language) query = query.eq("language", language);
    if (search) query = query.ilike("name", `%${search}%`);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { categories: data ?? [] },
    };
  },
});

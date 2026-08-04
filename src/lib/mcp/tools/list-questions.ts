import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_questions",
  title: "List trivia questions",
  description: "List active trivia questions for a category, including the correct and incorrect answers.",
  inputSchema: {
    category_id: z.string().describe("Category id to list questions for."),
    difficulty: z.string().optional().describe("Optional difficulty filter."),
    language: z.string().optional().describe("Optional language code filter, e.g. 'en'."),
    limit: z.number().int().optional().describe("Maximum questions to return (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ category_id, difficulty, language, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("questions")
      .select("id, question_text, correct_answer, incorrect_answers, difficulty, level_number, language")
      .eq("category_id", category_id)
      .eq("is_active", true)
      .order("level_number", { ascending: true })
      .limit(Math.min(Math.max(limit ?? 20, 1), 100));

    if (difficulty) query = query.eq("difficulty", difficulty);
    if (language) query = query.eq("language", language);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { questions: data ?? [] },
    };
  },
});

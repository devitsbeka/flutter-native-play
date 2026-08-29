import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Access to the social_frame_drafts table (admin-only by RLS).
 *
 * The table is newer than src/integrations/supabase/types.ts, and that file
 * must NOT be regenerated casually (see CLAUDE.md §1 — regenerating against
 * a database missing the entitlement migrations silently deletes six RPC
 * signatures). Until types are regenerated the safe way, this module is the
 * one place that talks to the table, with its row shape kept by hand.
 */

export interface FramePayload {
  id: string;
  question_text: string;
  correct_answer: string;
  icon_slug?: string | null;
  answers: string[];
  category_key?: string;
}

export interface FrameDraft {
  id: string;
  created_at: string;
  updated_at: string;
  language: string;
  format_key: string;
  w: number;
  h: number;
  reveal: boolean;
  question_id: string | null;
  payload: FramePayload;
  caption: string;
  platforms: string[];
  status: "draft" | "scheduled" | "posted" | "failed";
  scheduled_for: string | null;
  posted_at: string | null;
  late_post_id: string | null;
  platform_post_url: string | null;
  last_error: string | null;
}

export type NewFrameDraft = Pick<
  FrameDraft,
  "language" | "format_key" | "w" | "h" | "reveal" | "question_id" | "payload" | "caption" | "platforms"
> & { created_by: string | null };

// Untyped view of the client for this one table.
const db = supabase as unknown as SupabaseClient;

export const frameDrafts = {
  async list(): Promise<FrameDraft[]> {
    const { data, error } = await db
      .from("social_frame_drafts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data ?? []) as FrameDraft[];
  },

  async insert(draft: NewFrameDraft): Promise<FrameDraft> {
    const { data, error } = await db
      .from("social_frame_drafts")
      .insert(draft)
      .select("*")
      .single();
    if (error) throw error;
    return data as FrameDraft;
  },

  async update(id: string, patch: Partial<FrameDraft>): Promise<void> {
    const { error } = await db.from("social_frame_drafts").update(patch).eq("id", id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await db.from("social_frame_drafts").delete().eq("id", id);
    if (error) throw error;
  },
};

/** Default Georgian caption for a question post, hashtags included. */
export function defaultCaption(questionText: string): string {
  return `🧠 შეძლებ სწორად უპასუხო? ⏱️

${questionText}

დაწერე შენი პასუხი კომენტარებში 👇

ითამაშე ათასობით ქართული კითხვა სრულიად უფასოდ MyTrivia-ზე 🎮 → mytrivia.io

#MyTrivia #დღისკითხვა #ტრივია #კვიზი #ვიქტორინა #კითხვაპასუხი #თამაში #საქართველო #ქართული #quiz #trivia #quizoftheday #georgia`;
}

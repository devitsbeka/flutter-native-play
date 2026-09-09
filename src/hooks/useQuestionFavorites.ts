import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Saved questions — the heart in the answer-feedback card.
 *
 * `useFavorites` is the same idea one level up: it saves CATEGORIES, one row
 * per (user, category) in `user_favorites`. A question is not a category, so
 * this reads and writes `public.question_favorites`
 * (20261103100000_question_favorites_and_reports.sql) instead.
 *
 * Two things it does differently from its category sibling:
 *
 * - The local mirror is the source of truth for the button. A save is a
 *   grace note in the middle of a round, not an operation the player is
 *   waiting on, so the heart fills immediately and the write follows. Only
 *   a failed write puts it back.
 * - It degrades instead of erroring. Guests keep their list in
 *   localStorage, and so does a signed-in player whose database has not had
 *   the migration applied yet: the write fails, the list stays local, and
 *   nothing in the round is interrupted by a toast about a table.
 */

const GUEST_KEY = "guestQuestionFavorites";

function readLocal(): Set<string> {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    return raw ? new Set<string>(JSON.parse(raw)) : new Set<string>();
  } catch {
    return new Set<string>();
  }
}

function writeLocal(ids: Set<string>) {
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify([...ids]));
  } catch {
    // A private-mode browser with no storage is not a reason to break a round.
  }
}

export interface QuestionFavoriteInput {
  questionId: string;
  questionText?: string;
  categoryId?: string | null;
  language?: string;
}

export function useQuestionFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Set<string>>(() => readLocal());
  const [loading, setLoading] = useState(true);
  // Set once the database rejects a write — after that the list is local
  // only, and we stop retrying a table that is not there.
  const remoteUnavailable = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!user) {
        setFavorites(readLocal());
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("question_favorites" as never)
          .select("question_id")
          .eq("user_id", user.id);
        if (error) throw error;
        if (cancelled) return;
        const rows = (data ?? []) as unknown as { question_id: string }[];
        // The guest's local list survives the sign-in until it is merged;
        // showing both is closer to the truth than dropping either.
        setFavorites(new Set([...readLocal(), ...rows.map((r) => r.question_id)]));
      } catch (error) {
        // Not applied yet, or unreachable. Local list stands.
        console.warn("[questionFavorites] falling back to local list", error);
        remoteUnavailable.current = true;
        if (!cancelled) setFavorites(readLocal());
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const isFavorite = useCallback(
    (questionId: string) => favorites.has(questionId),
    [favorites],
  );

  const toggleFavorite = useCallback(
    async (input: QuestionFavoriteInput) => {
      const { questionId } = input;
      if (!questionId) return;

      const wasFavorite = favorites.has(questionId);
      const next = new Set(favorites);
      if (wasFavorite) next.delete(questionId);
      else next.add(questionId);

      setFavorites(next);
      writeLocal(next);

      if (!user || remoteUnavailable.current) return;

      try {
        if (wasFavorite) {
          const { error } = await supabase
            .from("question_favorites" as never)
            .delete()
            .eq("user_id", user.id)
            .eq("question_id", questionId);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("question_favorites" as never).insert({
            user_id: user.id,
            question_id: questionId,
            question_text: input.questionText ?? null,
            category_id: input.categoryId ?? null,
            language: input.language ?? null,
          } as never);
          if (error) throw error;
        }
      } catch (error) {
        // The heart stays where the player put it — the list is mirrored
        // locally either way — but stop writing to a table that answers no.
        console.warn("[questionFavorites] write failed, keeping local", error);
        remoteUnavailable.current = true;
      }
    },
    [favorites, user],
  );

  return { favorites, isFavorite, toggleFavorite, loading };
}

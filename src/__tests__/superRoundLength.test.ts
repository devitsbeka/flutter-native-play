/**
 * The super round is a five-question race to three.
 *
 * The rule was only ever half true. `tb_advance_super` has always ended the
 * blitz the moment a champion reaches 3 — but the board the client shipped
 * carried thirty super questions, the same slice as a board tile. So a round
 * where both champions kept missing had thirty questions of rope, and the
 * decider became a second match rather than the sudden end of the first.
 *
 * Five is the smallest board the server accepts (`tb_start_match` refuses
 * fewer than 5), so the cap needs no migration — which matters here, where
 * SQL lands by hand one paste at a time.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const context = read("src/contexts/TeamBattleContext.tsx");
const match = read("src/components/team-battle/TeamBattleMatch.tsx");

describe("the client ships five super questions", () => {
  it("five, not the thirty a board tile carries", () => {
    expect(context).toMatch(/super_questions: asQuestions\(superRes\.questions\.slice\(0, 5\)\)/);
    expect(context).not.toMatch(/super_questions: asQuestions\(superRes\.questions\.slice\(0, 30\)\)/);
  });

  it("the tiles keep theirs — the server validates 5..30 per tile", () => {
    expect(context).toMatch(/questions: asQuestions\(filled\.res\.questions\.slice\(0, 30\)\)/);
  });

  it("and five is enough to pass the server's own floor", () => {
    // tb_start_match: 'Board must carry at least 5 super-round questions'.
    const sql = read("supabase/migrations/20260924100000_tb_three_minute_turns.sql");
    expect(sql).toMatch(
      /jsonb_array_length\(COALESCE\(p_board -> 'super_questions', '\[\]'::jsonb\)\) < 5/,
    );
  });
});

describe("three correct answers ends it", () => {
  it("the server stops at 3, or when the five run out", () => {
    const sql = read("supabase/migrations/20260917100000_team_battle.sql");
    const advance = sql.slice(
      sql.indexOf("FUNCTION public.tb_advance_super"),
      sql.indexOf("REVOKE ALL ON FUNCTION public.tb_advance_super"),
    );
    expect(advance).toMatch(/IF v_score_a >= 3 OR v_score_b >= 3 OR v_next >= v_total THEN/);
    // v_total is the shipped array, so the cap above is what bounds the round.
    expect(advance).toMatch(
      /v_total\s+integer := jsonb_array_length\(COALESCE\(p_state\.super -> 'questions', '\[\]'::jsonb\)\)/,
    );
  });

  it("and the screen says so, with the count left", () => {
    const round = match.slice(match.indexOf("function PhaseSuperRound"));
    expect(round).toMatch(/t\("teamBattle\.firstTo3"\)/);
    expect(round).toMatch(/\{Math\.min\(index \+ 1, questions\.length\)\}\/\{questions\.length\}/);
  });
});

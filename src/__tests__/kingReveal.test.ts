/**
 * The King's reveal card, as the frame draws it.
 *
 * Three things were off. The two status chips were different objects — a
 * lit 3D sphere for the miss, a flat disc for the hit — so two rows saying
 * the same kind of thing looked like two different kinds of thing. The
 * round's point moved only in the scoreline, silently, in digits. And a
 * player who spotted a bad puzzle had nowhere to say so: the pool is
 * seeded, so a wrong answer key is a data bug that only the person reading
 * the explanation is ever positioned to catch.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  KING_REPORT_TYPE,
  kingReportFallbackRow,
  kingReportNote,
  kingReportRow,
  type KingReportInput,
} from "@/utils/kingQuestionReport";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const page = read("src/pages/KingPage.tsx");
const migration = read("supabase/migrations/20261003100000_king_question_reports.sql");

describe("the two chips are one object in two colours", () => {
  it("same box, same glyph weight, the frame's red and green", () => {
    // #ff4606 is the fill of the frame's own exported chip; #34d399 was
    // already right.
    expect(page).toMatch(/tone === "right" \? "bg-\[#34d399\]" : "bg-\[#ff4606\]"/);
    expect(page).toMatch(/flex size-9 shrink-0 items-center justify-center rounded-\[16px\]/);
    expect(page).toMatch(/<Check className="size-5 text-white" strokeWidth=\{3\} \/>/);
    expect(page).toMatch(/<X className="size-5 text-white" strokeWidth=\{3\} \/>/);
  });

  it("and the 3D cross is gone from this screen", () => {
    expect(page).not.toMatch(/answer-wrong-3d/);
    expect(page).not.toMatch(/iconAnswerWrong/);
  });
});

describe("who the point went to, under the card", () => {
  it("sits outside the white card and above the CTA", () => {
    const card = page.indexOf('<div className="rounded-[20px] bg-white p-5');
    const award = page.indexOf("<PointAwardRow");
    const hint = page.indexOf('t("king.captainNextHint")');
    expect(card).toBeGreaterThan(-1);
    expect(award).toBeGreaterThan(card);
    expect(award).toBeLessThan(hint);
    // The card's own closing tag comes first — the row is a sibling, not a
    // child. The frame puts it there because it is about the MATCH.
    expect(page).toMatch(/\n {12}<\/div>\n {12}<PointAwardRow/);
  });

  it("names the King on a miss and the team on a hit", () => {
    expect(page).toMatch(/toKing=\{!view\.last_result\.correct\}/);
    expect(page).toMatch(/teamName=\{teamName \|\| t\("king\.teamLabel"\)\}/);
    expect(page).toMatch(/src=\{toKing \? iconKingMascot : \(teamIcon \?\? ""\)\}/);
  });

  it("wears the frame's type: extrabold 18/26, green lead, dark recipient", () => {
    expect(page).toMatch(/text-\[18px\] font-extrabold uppercase leading-\[26px\][^"]*text-\[#1eb880\]/);
    expect(page).toMatch(/text-\[18px\] font-extrabold uppercase leading-\[26px\][^"]*text-\[#402666\]\/90/);
  });

  it("keeps the recipient's grammar out of the sentence", () => {
    // Georgian puts a case ending on the team name and none on the King, so
    // one interpolated string could not serve both.
    expect(page).toMatch(/t\("king\.pointToKing"\) : t\("king\.pointToTeam", \{ name: teamName \}\)/);
    const ka = read("src/locales/ka.ts");
    expect(ka).toMatch(/pointToTeam: "\{name\}-ს",/);
    expect(ka).toMatch(/pointToKing: "მეფეს",/);
    expect(ka).toMatch(/plusPoint: "\+ 1 ქულა",/);
  });
});

describe("the flag under the explanation", () => {
  it("is on both the duel and the solo reveal", () => {
    expect(page.match(/<ReportQuestionRow/g)).toHaveLength(2);
    expect(page).toMatch(/mode: "team",/);
    expect(page).toMatch(/mode: "solo",/);
  });

  it("reports the question that was ASKED, not the post-submit state", () => {
    // king_submit_answer returns a state whose `question` the server is free
    // to have dropped; a report naming no question is unactionable.
    expect(page).toMatch(/const askedRef = useRef<string>\(""\);/);
    expect(page).toMatch(/if \(state\?\.question\?\.question_text\) askedRef\.current =/);
    expect(page).toMatch(/questionText: askedRef\.current,/);
    expect(page).toMatch(/questionText: view\.last_result\.question_text,/);
  });

  it("writes the structured row AND the one the admin page reads", () => {
    // king_question_reports may not exist yet — migrations reach this
    // database by hand — and nothing in the app can read it when it does.
    expect(page).toMatch(/from\("king_question_reports" as never\)/);
    expect(page).toMatch(/from\("user_reports"\)\.insert\(fallback\)/);
    // A failure to report never blocks the reveal.
    expect(page).toMatch(/console\.warn\("\[King\] report failed"/);
  });

  it("turns into its own receipt, and resets on the next question", () => {
    expect(page).toMatch(/disabled=\{busy \|\| sent\}/);
    expect(page).toMatch(/setSent\(false\);\s*\n\s*\}, \[input\.questionText\]\);/);
    expect(page).toMatch(/t\("king\.reportThanks"\) : t\("king\.reportQuestion"\)/);
    expect(page).toMatch(/text-\[#ff615d\]/);
  });

  it("in all seven languages", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const locale = read(`src/locales/${lang}.ts`);
      for (const key of ["reportQuestion", "reportThanks", "plusPoint", "pointToKing"]) {
        expect(locale, `${lang}.${key}`).toMatch(new RegExp(`\\n\\s+${key}: "..`));
      }
      expect(locale, `${lang}.pointToTeam`).toMatch(/\n\s+pointToTeam: "[^"]*\{name\}/);
    }
  });
});

describe("where the reports land", () => {
  it("the table takes inserts from the reporter and reads from nobody", () => {
    expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS public\.king_question_reports/);
    expect(migration).toMatch(/ALTER TABLE public\.king_question_reports ENABLE ROW LEVEL SECURITY;/);
    expect(migration).toMatch(/FOR INSERT\s*\n\s*WITH CHECK \(user_id IS NULL OR auth\.uid\(\) = user_id\);/);
    // No client read path, same rule as words_word_reports — and here the
    // grant says so too, so reading is refused before RLS gets a say.
    expect(migration).not.toMatch(/FOR SELECT/);
    expect(migration).toMatch(
      /REVOKE ALL ON TABLE public\.king_question_reports FROM PUBLIC, anon, authenticated;/,
    );
    expect(migration).toMatch(
      /GRANT INSERT ON TABLE public\.king_question_reports TO anon, authenticated;/,
    );
    expect(migration).not.toMatch(/GRANT (SELECT|UPDATE|DELETE|ALL) ON TABLE public\.king_question_reports/);
    // The triage query joins on these.
    expect(migration).toMatch(/king_question_reports_question_idx\s*\n\s*ON public\.king_question_reports \(language, question_text\)/);
  });

  it("and the rules are executed, not just written", () => {
    // supabase/tests/11-king.sql runs these as the real client roles on a
    // real Postgres — as postgres they would pass whatever the policy says.
    const suite = read("supabase/tests/11-king.sql");
    expect(suite).toMatch(/SET LOCAL ROLE authenticated;/);
    expect(suite).toMatch(/SET LOCAL ROLE anon;/);
    expect(suite).toMatch(/'ok: nobody reports in somebody else''s name'/);
    expect(suite).toMatch(/'ok: the reporter cannot read reports back'/);
    expect(suite).toMatch(/'ok: a filed report cannot be edited from a client'/);
    expect(suite).toMatch(/'ok: a signed-out player can still report'/);
  });

  it("and the admin page can name what it is showing", () => {
    const admin = read("src/pages/admin/Reports.tsx");
    expect(admin).toMatch(/king_question: \{ label: "King კითხვა"/);
    expect(admin).toMatch(/<SelectItem value="king_question">/);
    // The Words flag has been filing unlabelled rows there since it shipped.
    expect(admin).toMatch(/words_word: \{ label: "Words სიტყვა"/);
  });
});

describe("the report row, run rather than read", () => {
  const base: KingReportInput = {
    userId: "u1",
    language: "ka",
    mode: "team",
    matchId: "m1",
    roomId: "r1",
    questionNumber: 3,
    questionText: "ბაბუა, მამა და შვილი?",
    correctAnswer: "სამი ადამიანი",
  };

  it("the note leads with the question, because that is what gets fixed", () => {
    const note = kingReportNote(base);
    expect(note).toContain("ბაბუა, მამა და შვილი?");
    expect(note.indexOf("ბაბუა")).toBeLessThan(note.indexOf("სამი ადამიანი"));
    expect(note).toContain("[king/team] ka");
    expect(note).toContain("q3");
    expect(note).toContain("match m1");
  });

  it("and never runs past what a list column can show", () => {
    const long = kingReportNote({ ...base, questionText: "ა".repeat(4000) });
    expect(long.length).toBeLessThanOrEqual(900);
    expect(long.endsWith("…")).toBe(true);
  });

  it("survives a question with no number and no answer", () => {
    const note = kingReportNote({ ...base, questionNumber: null, correctAnswer: null });
    expect(note).not.toContain("q3");
    expect(note).not.toContain("answer:");
    expect(note).toContain("ბაბუა");
  });

  it("the structured row carries every column the table declares", () => {
    const row = kingReportRow(base);
    expect(row).toEqual({
      user_id: "u1",
      language: "ka",
      mode: "team",
      match_id: "m1",
      room_id: "r1",
      question_number: 3,
      question_text: "ბაბუა, მამა და შვილი?",
      correct_answer: "სამი ადამიანი",
    });
    for (const col of Object.keys(row)) {
      expect(migration, col).toMatch(new RegExp(`\\n  ${col}\\s`));
    }
  });

  it("the fallback stands the reporter in for a question, and needs a user", () => {
    const row = kingReportFallbackRow(base);
    // reported_user_id is NOT NULL and a question is not a person.
    expect(row?.reporter_id).toBe("u1");
    expect(row?.reported_user_id).toBe("u1");
    expect(row?.report_type).toBe(KING_REPORT_TYPE);
    expect(row?.description).toBe(kingReportNote(base));
    expect(row?.room_id).toBe("r1");
    // A signed-out player cannot file one: user_reports has no null reporter.
    expect(kingReportFallbackRow({ ...base, userId: null })).toBeNull();
  });
});

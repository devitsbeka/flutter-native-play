import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(p, "utf8");
const poll = read("src/hooks/useTVPoll.ts");
const results = read("src/components/controller/ControllerPollResults.tsx");
const ctx = read("src/contexts/TVGameContext.tsx");

/**
 * "after voting it stuck, can't start voted rounds" (owner).
 *
 * The poll fetched the first round's questions with a hand-written query
 * pinned to Georgian — `.eq('language', 'ka')`, no media columns, no
 * seen-question tracking. An English player's winning round came back
 * empty, and the fallback quietly parked the session in its lobby and
 * answered "started", so the TV, the host and every player watched a
 * screen that was never going to move.
 */
describe("the voted rounds are fetched like every other round", () => {
  it("through the question service, in the player's language, with the pictures", () => {
    expect(poll).toMatch(/const \{ getQuestions \} = await import\('@\/services\/questionService'\);/);
    expect(poll).toMatch(/const result = await getQuestions\(\{ mode: 'tv', categoryUuid, count: 10 \}\);/);
    expect(poll).toMatch(/image_url: q\.imageUrl \?\? null,/);
    expect(poll).toMatch(/video_url: q\.videoUrl \?\? null,/);
    expect(poll).toMatch(/markQuestionsAsAsked\(`tv_\$\{categoryUuid\}`/);
    // The hand-written Georgian query is gone (it survives only as the
    // comment explaining what it cost).
    expect(poll).not.toMatch(/\n\s+\.eq\('language', 'ka'\)/);
    expect(poll).not.toMatch(/\.eq\('in_production', true\)/);
  });

  it("and a round with nothing to ask says so instead of answering 'started'", () => {
    expect(poll).toMatch(/export type PollStartResult = \{ started: boolean; reason\?: "no_questions" \| "failed" \};/);
    expect(poll).toMatch(/return \{ started: false, reason: "no_questions" \};/);
    expect(poll).toMatch(/return \{ started: true \};/);
    expect(poll).not.toMatch(/\n      return true;\n    \}\n\n    console\.log\('\[finalizePollAndStartGame\] 🗑️/);
    expect(results).toMatch(/result\.reason === "no_questions"\s*\n\s*\? t\("extra\.noQuestionsInLang"\)\s*\n\s*: t\("extra\.tvStartGameFailed"\)/);
  });

  it("the queue write is checked, and the played round is consumed by its own id", () => {
    expect(poll).toMatch(/\.insert\(queueItems as any\)\s*\n\s*\.select\('id, position'\);/);
    expect(poll).toMatch(/if \(queueInsertError\) \{[\s\S]*?return \{ started: false, reason: "failed" \};/);
    expect(poll).toMatch(/const playedRow = \(insertedQueue \?\? \[\]\)\.find\(row => row\.position === 0\);/);
    expect(poll).toMatch(/\? await supabase\.from\('tv_session_queue'\)\.delete\(\)\.eq\('id', playedRow\.id\)/);
  });
});

describe("a phone that loses a race does not walk ahead of the session", () => {
  it("a lost reveal->question CAS resyncs instead of stepping onto the next question", () => {
    expect(ctx).toMatch(/if \(!nextCasRows\?\.length\) \{[\s\S]*?await refetchSessionData\(state\.sessionId\);\s*\n\s*return;\s*\n\s*\}/);
  });
});

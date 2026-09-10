/**
 * A report, as the admin's inbox shows it.
 *
 * notify_admins_of_report drops one notification per admin when a report
 * is filed, and left it with an English title, the report's raw description
 * for a body — a machine note with the question's uuid in it, for a
 * question reported from the answer card — the info tile every unknown
 * type wears, and a tap that opened nothing (owner: "why am i seeing this
 * report notification like that in my activity log ... fix the report
 * notification in activity log").
 *
 *   title   said in the admin's language;
 *   body    the question and its answer for a question report, the reason
 *           and the reporter's words for any other — never the id;
 *   icon    a flag;
 *   tap     the Reports page, open on that report.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const translations = read("src/utils/notificationTranslations.ts");
const icons = read("src/config/notificationIcons.ts");
const page = read("src/pages/Notifications.tsx");
const panel = read("src/components/home/NotificationsPanel.tsx");
const reports = read("src/pages/admin/Reports.tsx");

describe("the words", () => {
  it("title from a key, body from the report — the trivia note read out, the id dropped", () => {
    expect(translations).toMatch(/'moderation_report': 'extra\.reportNotifTitle',/);
    expect(translations).toMatch(/if \(type === 'moderation_report'\) return describeReport\(originalMessage, data\);/);
    expect(translations).toMatch(/if \(message\.startsWith\('\[trivia\/'\) && quoted\) \{/);
    expect(translations).toMatch(/const answer = message\.match\(\/answer: \(\.\+\?\)\(\?: · \|\$\)\/\);/);
    expect(translations).toMatch(/return answer \? `“\$\{quoted\[1\]\}” · \$\{answer\[1\]\}` : `“\$\{quoted\[1\]\}”`;/);
    expect(translations).toMatch(/const reasonKey = `moderation\.reason\.\$\{reportType\}`;/);
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      expect(read(`src/locales/${lang}.ts`), lang).toMatch(/\n\s+reportNotifTitle: "[^"]+",/);
    }
  });

  it("the note's shape is the one the answer card writes", () => {
    const note = read("src/utils/triviaQuestionReport.ts");
    expect(note).toMatch(/`\[trivia\/\$\{input\.source\}\] \$\{input\.language\}`,/);
    expect(note).toMatch(/`“\$\{input\.questionText\}”`,/);
    expect(note).toMatch(/input\.correctAnswer \? `answer: \$\{input\.correctAnswer\}` : null,/);
    expect(note).toMatch(/const note = parts\.join\(" · "\);/);
  });
});

describe("the tile and the tap", () => {
  it("wears a flag, and opens the Reports page on the report", () => {
    expect(icons).toMatch(/import moderationreportIcon from "@\/assets\/notifications\/moderation_report\.svg";/);
    expect(icons).toMatch(/moderation_report: moderationreportIcon,/);
    const tap = /case 'moderation_report':[\s\S]*?navigate\(data\?\.report_id \? `\/admin\/reports\?report=\$\{data\.report_id\}` : '\/admin\/reports'\);/;
    expect(page).toMatch(tap);
    expect(panel).toMatch(tap);
    expect(read("src/contexts/NotificationsContext.tsx")).toMatch(/\| 'moderation_report';/);
  });

  it("the Reports page lands on it once, then forgets the parameter", () => {
    expect(reports).toMatch(/const wantedReportId = searchParams\.get\('report'\);/);
    expect(reports).toMatch(/const wanted = reports\.find\(\(r\) => r\.id === wantedReportId\);\s*\n\s*if \(wanted\) setSelectedReport\(wanted\);/);
    expect(reports).toMatch(/prev\.delete\('report'\); return prev; \}, \{ replace: true \}\);/);
  });
});

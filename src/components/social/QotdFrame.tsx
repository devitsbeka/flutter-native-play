/**
 * Question-of-the-Day social frame — the post template rendered at each
 * network's exact pixel size, filled with a real question from the production
 * pool. Extracted from the admin Social Frames page so scripts (e.g. the
 * social posting pipeline) can render the very same component headlessly:
 * what gets posted is what the admin page previews, not a copy.
 *
 * Everything inside the frame is styled with literal colors, not theme
 * tokens: a post must look identical whether the admin runs light or dark.
 */

export interface Question {
  id: string;
  question_text: string;
  correct_answer: string;
  incorrect_answers: unknown;
  difficulty: string;
  category_id: string;
}

/** The frame's own copy, per app language, so a Georgian post is Georgian. */
export const FRAME_COPY: Record<string, { eyebrow: string; cta: string }> = {
  ka: { eyebrow: "დღის კითხვა", cta: "უპასუხე აპლიკაციაში" },
  en: { eyebrow: "Question of the Day", cta: "Answer in the app" },
  de: { eyebrow: "Frage des Tages", cta: "Antworte in der App" },
  es: { eyebrow: "Pregunta del día", cta: "Responde en la app" },
  fr: { eyebrow: "Question du jour", cta: "Répondez dans l'app" },
  it: { eyebrow: "Domanda del giorno", cta: "Rispondi nell'app" },
  pt: { eyebrow: "Pergunta do dia", cta: "Responda no app" },
};

/** Stable per-question shuffle so the same question always shows the same order. */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (const ch of seed) h = (h ^ ch.charCodeAt(0)) * 16777619;
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Brand colors as literals — frames must not follow the admin theme. */
const INK = {
  bgFrom: "hsl(263 60% 52%)",
  bgTo: "hsl(263 55% 34%)",
  card: "rgba(255 255 255 / 0.14)",
  cardBorder: "rgba(255 255 255 / 0.22)",
  text: "#FFFFFF",
  dim: "rgba(255 255 255 / 0.72)",
  accent: "hsl(30 95% 58%)",
} as const;

export function QotdFrame({
  w,
  h,
  question,
  answers,
  reveal,
  lang,
  dateLabel,
}: {
  w: number;
  h: number;
  question: Question;
  answers: string[];
  reveal: boolean;
  lang: string;
  dateLabel: string;
}) {
  const wide = w / h > 1.2;
  const copy = FRAME_COPY[lang] ?? FRAME_COPY.en;
  // Long questions shrink; the breakpoints were eyeballed against the pool.
  const qLen = question.question_text.length;
  const base = wide ? Math.round(h / 11) : Math.round(w / 13);
  const qSize = qLen > 140 ? Math.round(base * 0.62) : qLen > 80 ? Math.round(base * 0.78) : base;
  const answerSize = Math.round((wide ? h : w) / (wide ? 26 : 30));
  const pad = Math.round(w * (wide ? 0.05 : 0.08));

  const letters = ["A", "B", "C", "D"];

  const answerCards = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: wide ? "1fr" : "1fr 1fr",
        gap: Math.round(w * 0.018),
        width: "100%",
      }}
    >
      {answers.map((a, i) => {
        const isCorrect = a === question.correct_answer;
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: Math.round(answerSize * 0.5),
              background: INK.card,
              border: `2px solid ${reveal && isCorrect ? INK.accent : INK.cardBorder}`,
              boxShadow: reveal && isCorrect ? `0 0 0 6px ${INK.accent}44` : undefined,
              borderRadius: Math.round(answerSize * 0.8),
              padding: `${Math.round(answerSize * 0.55)}px ${Math.round(answerSize * 0.7)}px`,
              color: INK.text,
              fontSize: answerSize,
              fontWeight: 600,
              lineHeight: 1.25,
              minWidth: 0,
            }}
          >
            <span
              style={{
                flexShrink: 0,
                width: Math.round(answerSize * 1.6),
                height: Math.round(answerSize * 1.6),
                borderRadius: "50%",
                background: reveal && isCorrect ? INK.accent : "rgba(255 255 255 / 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: Math.round(answerSize * 0.85),
                fontWeight: 800,
              }}
            >
              {letters[i]}
            </span>
            <span style={{ overflowWrap: "break-word", minWidth: 0 }}>{a}</span>
          </div>
        );
      })}
    </div>
  );

  const header = (
    <div style={{ display: "flex", flexDirection: "column", gap: Math.round(w * 0.012) }}>
      <div
        style={{
          alignSelf: "flex-start",
          background: INK.accent,
          color: "#2B1A05",
          fontSize: Math.round(base * 0.42),
          fontWeight: 800,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          padding: `${Math.round(base * 0.18)}px ${Math.round(base * 0.45)}px`,
          borderRadius: 999,
        }}
      >
        {copy.eyebrow}
      </div>
      <div style={{ color: INK.dim, fontSize: Math.round(base * 0.38), fontWeight: 600 }}>
        {dateLabel}
      </div>
    </div>
  );

  const questionBlock = (
    <div
      style={{
        color: INK.text,
        fontSize: qSize,
        fontWeight: 800,
        lineHeight: 1.18,
        overflowWrap: "break-word",
      }}
    >
      {question.question_text}
    </div>
  );

  const footer = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        color: INK.text,
      }}
    >
      <div style={{ fontSize: Math.round(base * 0.5), fontWeight: 800 }}>
        My<span style={{ color: INK.accent }}>Trivia</span>
      </div>
      <div style={{ color: INK.dim, fontSize: Math.round(base * 0.36), fontWeight: 600 }}>
        {copy.cta} · mytrivia.io
      </div>
    </div>
  );

  return (
    <div
      style={{
        width: w,
        height: h,
        background: `radial-gradient(circle at 85% -10%, rgba(255 255 255 / 0.16), transparent 45%), linear-gradient(150deg, ${INK.bgFrom} 0%, ${INK.bgTo} 100%)`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: pad,
        overflow: "hidden",
        fontFamily: "inherit",
      }}
    >
      {wide ? (
        <div style={{ display: "flex", gap: pad, flex: 1, minHeight: 0 }}>
          <div
            style={{
              flex: 1.15,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minWidth: 0,
            }}
          >
            {header}
            {questionBlock}
            {footer}
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", minWidth: 0 }}>
            {answerCards}
          </div>
        </div>
      ) : (
        <>
          {header}
          {questionBlock}
          {answerCards}
          {footer}
        </>
      )}
    </div>
  );
}

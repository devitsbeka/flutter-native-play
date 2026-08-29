/**
 * StarQuestionFrame — the Figma "Step07" post design (file
 * kTmQjqS4JrxlOYP9NdN4Vl, node 915:1841) across every canvas the social
 * pipeline posts to: starry purple background, character on a sparkle line,
 * the question in Manrope over chunky answer pills (the correct one green
 * with a check when revealed), and the power-up row.
 *
 * Four layouts, matching the design file's own variants:
 *  - native   (≥2.0):   the 1242×2688 App Store node, absolute and exact
 *  - tall     (1.6–2.0): Stories / Reels / TikTok / Shorts — the portrait
 *                        variant constrained to the network's safe area
 *  - portrait (0.95–1.6): the file's "Instagram post" 4:5 variant
 *  - wide     (<0.95):   the file's "Facebook post" variant — question on
 *                        top, answers in a 2×2 grid, no avatar/power-ups
 *
 * Element styling (colors, radii, depth shadows, typography, badge
 * proportions) is identical everywhere and comes from the node's values;
 * only placement changes per canvas. Assets live in public/social-frames/
 * (downloaded from Figma — the MCP asset URLs expire). Literal colors on
 * purpose: posts must not follow the admin theme.
 */

import { DynamicIcon } from "@/components/shared/DynamicIcon";

export interface StarFrameQuestion {
  id: string;
  question_text: string;
  correct_answer: string;
  /** The question's assigned icon (questions.icon_slug) — same source the game uses. */
  icon_slug?: string | null;
}

/** Keep-clear insets in canvas px — the platform UI covers these areas. */
export interface SafeInsets {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

const ASSETS = "/social-frames";

const LETTERS: Record<string, string[]> = {
  ka: ["ა", "ბ", "გ", "დ"],
  en: ["A", "B", "C", "D"],
};

/**
 * Answer pill — node 915:2107..2124. `s` scales the node's own dimensions
 * (row 161 high, radius 55, badge 76×94, text 59), so every variant keeps
 * the exact proportions at its own row size.
 */
function AnswerRow({
  text,
  letter,
  correct,
  s,
  width,
}: {
  text: string;
  letter: string;
  correct: boolean;
  s: number;
  width: number;
}) {
  const fontSize = 59.177 * s * (text.length > 24 ? 0.62 : text.length > 16 ? 0.8 : 1);
  return (
    <div
      style={{
        position: "relative",
        width,
        height: 161.093 * s,
        borderRadius: 55.187 * s,
        background: correct ? "#10b981" : "rgba(255,255,255,0.9)",
        boxShadow: correct
          ? `0px ${11.037 * s}px 0px 0px #059669`
          : `0px ${11.037 * s}px 0px 0px #d1d5db`,
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
      }}
    >
      {correct ? (
        <img
          src={`${ASSETS}/check-badge.svg`}
          alt=""
          style={{
            position: "absolute",
            left: 50 * s,
            top: 43 * s,
            width: 76 * s,
            height: 76 * s,
          }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            left: 49.91 * s,
            top: 34.52 * s,
            width: 76.176 * s,
            height: 93.697 * s,
            borderRadius: 39.451 * s,
            background: "#e8ccfb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontFamily: "'Google Sans', 'Nunito', sans-serif",
              fontWeight: 500,
              fontSize: 42.739 * s,
              color: "#010a58",
              textTransform: "capitalize",
              lineHeight: 1,
            }}
          >
            {letter}
          </span>
        </div>
      )}
      <span
        style={{
          position: "absolute",
          left: 168.47 * s,
          right: 30 * s,
          fontFamily: "'Nunito Sans', 'Nunito', 'Noto Sans Georgian', sans-serif",
          fontWeight: 700,
          fontSize,
          letterSpacing: `${-0.4483 * s}px`,
          color: correct ? "#FFFFFF" : "#402666",
          textTransform: "capitalize",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {text}
      </span>
    </div>
  );
}

/** Background stack — node 771:1508 plus the template overlay of 915:1843. */
function Background() {
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div style={{ position: "absolute", inset: 0, background: "#0c161c" }} />
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <img
          alt=""
          src={`${ASSETS}/bg-starfield.png`}
          style={{
            position: "absolute",
            height: "100%",
            width: "277.83%",
            left: "-75.82%",
            top: "-3.14%",
            maxWidth: "none",
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom, rgba(8,14,18,0), #080e12 54.113%)",
        }}
      />
      <img
        alt=""
        src={`${ASSETS}/template-overlay.png`}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
}

/**
 * The design's top-center image slot with the sparkle line running behind
 * it. The Figma node shows an example character; in production the slot is
 * the question's own icon, resolved exactly like the game screen does —
 * questions.icon_slug first, then the category's icon, then a per-question
 * seeded pick from the category's set.
 */
function QuestionIcon({
  question,
  categoryKey,
  size,
}: {
  question: StarFrameQuestion;
  categoryKey?: string;
  size: number;
}) {
  return (
    <DynamicIcon
      slug={question.icon_slug || undefined}
      categoryId={categoryKey}
      questionId={question.id}
      seedText={question.question_text}
      size={size}
      fallbackEmoji="🧠"
      className="drop-shadow-lg"
    />
  );
}

function AvatarCluster({
  width,
  avatarH,
  question,
  categoryKey,
}: {
  width: number;
  avatarH: number;
  question: StarFrameQuestion;
  categoryKey?: string;
}) {
  return (
    <div style={{ position: "relative", width, flexShrink: 0 }}>
      <img
        src={`${ASSETS}/sparkle-line.svg`}
        alt=""
        style={{
          position: "absolute",
          left: 0,
          top: avatarH * 0.42,
          width: "100%",
          height: avatarH * 0.28,
        }}
      />
      <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
        <QuestionIcon question={question} categoryKey={categoryKey} size={avatarH} />
      </div>
    </div>
  );
}

function questionFontSize(text: string, base: number) {
  return text.length > 110 ? base * 0.62 : text.length > 70 ? base * 0.78 : base;
}

export function StarQuestionFrame({
  w,
  h,
  question,
  answers,
  reveal,
  lang,
  safeInsets,
  categoryKey,
}: {
  w: number;
  h: number;
  question: StarFrameQuestion;
  answers: string[];
  reveal: boolean;
  lang: string;
  safeInsets?: SafeInsets;
  /** ASCII category key (categories.category_id) for the icon fallback chain. */
  categoryKey?: string;
}) {
  const letters = LETTERS[lang] ?? LETTERS.en;
  const ratio = h / w;
  const safe = {
    top: safeInsets?.top ?? 0,
    bottom: safeInsets?.bottom ?? 0,
    left: safeInsets?.left ?? 0,
    right: safeInsets?.right ?? 0,
  };

  const frameStyle: React.CSSProperties = {
    width: w,
    height: h,
    position: "relative",
    overflow: "hidden",
    background: "#080e12",
  };

  const questionStyle = (size: number, tracking: number): React.CSSProperties => ({
    fontFamily: "'Manrope', 'Nunito Sans', 'Noto Sans Georgian', sans-serif",
    fontWeight: 600,
    fontSize: questionFontSize(question.question_text, size),
    lineHeight: 1.2,
    letterSpacing: `${tracking}px`,
    color: "#FEFEFE",
    textAlign: "center",
    overflowWrap: "break-word",
    margin: 0,
  });

  const rows = (s: number, width: number) =>
    answers.map((a, i) => (
      <AnswerRow
        key={i}
        text={a}
        letter={letters[i]}
        correct={reveal && a === question.correct_answer}
        s={s}
        width={width}
      />
    ));

  // ---- Native (App Store 6.5″): the node's own absolute layout, exact. ----
  if (ratio >= 2.0) {
    const s = w / 1242;
    const ky = h / 2688;
    return (
      <div style={frameStyle}>
        <Background />
        <div
          style={{
            position: "absolute",
            left: 103.5 * s,
            top: 187 * ky,
            width: 1031 * s,
            height: 84 * s,
          }}
        >
          <img src={`${ASSETS}/sparkle-line.svg`} alt="" style={{ width: "100%", height: "100%" }} />
        </div>
        <div
          style={{
            position: "absolute",
            left: 431 * s,
            top: 79 * ky,
            width: 380 * s,
            height: 400 * s,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <QuestionIcon question={question} categoryKey={categoryKey} size={380 * s} />
        </div>
        <p
          style={{
            ...questionStyle(120 * s, -4.8 * s),
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            top: 535 * ky,
            width: 936 * s,
          }}
        >
          {question.question_text}
        </p>
        <div
          style={{
            position: "absolute",
            left: 106 * s,
            top: 1288 * ky,
            display: "flex",
            flexDirection: "column",
            gap: 32.877 * s,
          }}
        >
          {rows(s, 1031 * s)}
        </div>
        <img
          src={`${ASSETS}/powerups-row.png`}
          alt=""
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            bottom: 171.46 * ky,
            width: 1030.986 * s,
            height: 284.544 * s,
            objectFit: "contain",
          }}
        />
      </div>
    );
  }

  // ---- Tall (Stories / Reels / TikTok / Shorts): the portrait variant kept
  // inside the platform's safe area. ----
  if (ratio >= 1.6) {
    const c = w / 1080;
    // The usable box once platform chrome is excluded.
    const boxLeft = Math.max(60 * c, safe.left);
    const boxRight = Math.max(60 * c, safe.right);
    const boxTop = Math.max(80 * c, safe.top);
    const boxBottom = Math.max(80 * c, safe.bottom);
    const boxW = w - boxLeft - boxRight;
    const rowS = Math.min(1, boxW / (1031 * c)) * (140 / 161.093) * c;
    return (
      <div style={frameStyle}>
        <Background />
        <div
          style={{
            position: "absolute",
            left: boxLeft,
            top: boxTop,
            width: boxW,
            height: h - boxTop - boxBottom,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <AvatarCluster width={boxW} avatarH={240 * c} question={question} categoryKey={categoryKey} />
          <p style={{ ...questionStyle(88 * c, -3.5 * c), width: Math.min(880 * c, boxW) }}>
            {question.question_text}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 28 * c }}>
            {rows(rowS, Math.min(860 * c, boxW))}
          </div>
        </div>
        {/* Power-ups sit at the actual bottom of the canvas, outside the
            safe box: they are decoration, not information, so platform
            chrome overlapping them costs nothing — while keeping them in
            the box glued them to the answers and left the page bottom
            empty. */}
        <img
          src={`${ASSETS}/powerups-row.png`}
          alt=""
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            bottom: 90 * c,
            width: 620 * c,
            height: 171 * c,
            objectFit: "contain",
          }}
        />
      </div>
    );
  }

  // ---- Portrait / square: the file's "Instagram post" 4:5 variant. ----
  if (ratio >= 0.95) {
    const c = w / 1080;
    const square = ratio < 1.15;
    const rowS = (104 / 161.093) * c;
    return (
      <div style={frameStyle}>
        <Background />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            padding: `${(square ? 48 : 74) * c}px ${100 * c}px ${(square ? 60 : 144) * c}px`,
          }}
        >
          <AvatarCluster width={700 * c} avatarH={(square ? 100 : 133) * c} question={question} categoryKey={categoryKey} />
          <p style={{ ...questionStyle((square ? 46 : 50) * c, -2 * c), width: 780 * c }}>
            {question.question_text}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 21 * c }}>
            {rows(rowS, 665 * c)}
          </div>
          <img
            src={`${ASSETS}/powerups-row.png`}
            alt=""
            style={{ width: 556 * c, height: 153 * c, objectFit: "contain" }}
          />
        </div>
      </div>
    );
  }

  // ---- Wide: the file's "Facebook post" variant — question on top,
  // answers in a 2×2 grid, no avatar or power-ups. ----
  const c = Math.min(w / 1200, h / 630);
  const rowS = (104 / 161.093) * c;
  const colW = 515 * c;
  return (
    <div style={frameStyle}>
      <Background />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 56 * c,
          padding: `${60 * c}px ${70 * c}px`,
        }}
      >
        <p style={{ ...questionStyle(48 * c, -1.9 * c), width: 800 * c }}>
          {question.question_text}
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `${colW}px ${colW}px`,
            columnGap: 30 * c,
            rowGap: 23 * c,
          }}
        >
          {rows(rowS, colW)}
        </div>
      </div>
    </div>
  );
}

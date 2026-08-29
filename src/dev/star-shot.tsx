/**
 * Star Shot — headless render target for StarQuestionFrame (the Step07
 * Figma design), dev-server only like social-shot. The posting pipeline
 * screenshots this at the canvas size it needs.
 *
 * ?w=1242&h=2688&question=…&answers=a|b|c|d&correct=…&reveal=1&lang=ka
 * &safe=top,bottom,left,right   (canvas px, for Stories/TikTok chrome)
 */
import { createRoot } from "react-dom/client";
import { StarQuestionFrame } from "@/components/social/StarQuestionFrame";
import "@/components/social/star-frame.css";

const params = new URLSearchParams(window.location.search);
const get = (key: string, fallback: string) => params.get(key) ?? fallback;

const w = Number(get("w", "1242"));
const h = Number(get("h", "2688"));
const answers = get("answers", "ქათამი|არწივი|ნიანგი|სირაქლემა").split("|");
const question = {
  id: get("id", "manual"),
  question_text: get("question", "რომელი ცხოველი დებს ყველაზე დიდ კვერცხს?"),
  correct_answer: get("correct", "სირაქლემა"),
  icon_slug: params.get("iconSlug"),
};

const [st, sb, sl, sr] = get("safe", "0,0,0,0").split(",").map(Number);

createRoot(document.getElementById("root")!).render(
  <StarQuestionFrame
    w={w}
    h={h}
    question={question}
    answers={answers}
    reveal={get("reveal", "1") === "1"}
    lang={get("lang", "ka")}
    safeInsets={{ top: st, bottom: sb, left: sl, right: sr }}
    categoryKey={params.get("categoryKey") ?? undefined}
  />,
);

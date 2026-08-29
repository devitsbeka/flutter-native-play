import { createRoot } from "react-dom/client";
import { toPng } from "html-to-image";
import { StarQuestionFrame } from "@/components/social/StarQuestionFrame";
import { PromoSlide, promoByKey } from "@/components/social/PromoSlide";
import { formatByKey } from "@/components/social/frameFormats";
import type { CarouselSlide, FrameDraft } from "@/components/social/frameDrafts";

/**
 * Render a saved frame to PNGs in the browser — the same components the
 * carousel previews, mounted offscreen at full pixel size. The admin's
 * browser already has the fonts and can reach the icon library, so no
 * server-side renderer is needed.
 *
 * A single-question draft yields one image; a carousel draft yields one per
 * slide, in posting order. Base64 without the data: prefix (what
 * social-post wants).
 */

async function renderNode(node: React.ReactElement, w: number, h: number): Promise<string> {
  const host = document.createElement("div");
  host.style.cssText = `position:fixed;left:-100000px;top:0;width:${w}px;height:${h}px;overflow:hidden;`;
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    root.render(node);
    await document.fonts.ready;
    // Icons and hero art arrive asynchronously; wait until every <img> in
    // the frame has finished, bounded at 8s.
    const deadline = Date.now() + 8000;
    for (;;) {
      const imgs = Array.from(host.querySelectorAll("img"));
      const pending = imgs.filter((img) => !img.complete || img.naturalWidth === 0);
      if (imgs.length > 0 && pending.length === 0) break;
      if (Date.now() > deadline) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    await new Promise((r) => setTimeout(r, 250));
    const dataUrl = await toPng(host.firstElementChild as HTMLElement, {
      width: w,
      height: h,
      pixelRatio: 1,
      cacheBust: false,
    });
    return dataUrl.replace(/^data:image\/png;base64,/, "");
  } finally {
    root.unmount();
    host.remove();
  }
}

export async function renderDraftToPngs(draft: FrameDraft): Promise<string[]> {
  const format = formatByKey(draft.format_key);
  const w = format?.w ?? draft.w;
  const h = format?.h ?? draft.h;

  const slides: CarouselSlide[] = draft.payload.slides ?? [
    { type: "question", question: draft.payload },
  ];

  const out: string[] = [];
  for (const slide of slides) {
    if (slide.type === "promo") {
      const spec = promoByKey(slide.promo);
      if (!spec) throw new Error(`Unknown promo slide "${slide.promo}"`);
      out.push(
        await renderNode(
          <PromoSlide w={w} h={h} spec={spec} safeInsets={format?.safeInsets} />,
          w,
          h,
        ),
      );
    } else {
      out.push(
        await renderNode(
          <StarQuestionFrame
            w={w}
            h={h}
            question={slide.question}
            answers={slide.question.answers}
            reveal={draft.reveal}
            lang={draft.language}
            safeInsets={format?.safeInsets}
            categoryKey={slide.question.category_key}
          />,
          w,
          h,
        ),
      );
    }
  }
  return out;
}

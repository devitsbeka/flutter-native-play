import { createRoot } from "react-dom/client";
import { toPng } from "html-to-image";
import { StarQuestionFrame } from "@/components/social/StarQuestionFrame";
import { formatByKey } from "@/components/social/frameFormats";
import type { FrameDraft } from "@/components/social/frameDrafts";

/**
 * Render a saved frame to a PNG in the browser — the same component the
 * carousel previews, mounted offscreen at full pixel size. The admin's
 * browser already has the fonts and can reach the icon library, so no
 * server-side renderer is needed.
 *
 * Returns base64 PNG data without the data: prefix (what social-post wants).
 */
export async function renderDraftToPng(draft: FrameDraft): Promise<string> {
  const format = formatByKey(draft.format_key);
  const w = format?.w ?? draft.w;
  const h = format?.h ?? draft.h;

  const host = document.createElement("div");
  host.style.cssText = `position:fixed;left:-100000px;top:0;width:${w}px;height:${h}px;overflow:hidden;`;
  document.body.appendChild(host);
  const root = createRoot(host);

  try {
    root.render(
      <StarQuestionFrame
        w={w}
        h={h}
        question={draft.payload}
        answers={draft.payload.answers}
        reveal={draft.reveal}
        lang={draft.language}
        safeInsets={format?.safeInsets}
        categoryKey={draft.payload.category_key}
      />,
    );

    await document.fonts.ready;

    // The icon resolves asynchronously (library fetch, then the image).
    // Wait until every <img> in the frame has finished, bounded at 8s.
    const deadline = Date.now() + 8000;
    for (;;) {
      const imgs = Array.from(host.querySelectorAll("img"));
      const pending = imgs.filter((img) => !img.complete || img.naturalWidth === 0);
      if (imgs.length > 0 && pending.length === 0) break;
      if (Date.now() > deadline) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    // One settle frame for layout after the last image landed.
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

import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";

export interface SharePayload {
  title?: string;
  text?: string;
  url?: string;
}

export type ShareOutcome = "shared" | "dismissed" | "copied" | "failed";

/**
 * Hand a link (or text) to the share sheet, falling back to the clipboard.
 *
 * The lobby's share button used navigator.share directly, which the iOS
 * webview does not reliably provide, and navigator.clipboard as the fallback,
 * which WKWebView refuses once the tap's transient activation is spent — so
 * on the device both legs failed and the user only ever saw "Share failed".
 * On native we now go through the Capacitor Share plugin, which presents the
 * real UIActivityViewController and cannot be vetoed by the webview.
 *
 * Callers decide what to toast: "copied" deserves a confirmation, "failed"
 * an error, and "shared"/"dismissed" nothing at all — closing the share
 * sheet without picking a target is not a failure.
 */
export async function shareOrCopy(payload: SharePayload): Promise<ShareOutcome> {
  if (Capacitor.isNativePlatform()) {
    try {
      await Share.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
      });
      return "shared";
    } catch (err) {
      if (/cancel/i.test((err as Error)?.message ?? "")) return "dismissed";
      return copyToClipboard(payload.url ?? payload.text ?? "");
    }
  }

  if (navigator.share && (!navigator.canShare || navigator.canShare(payload))) {
    try {
      await navigator.share(payload);
      return "shared";
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return "dismissed";
      return copyToClipboard(payload.url ?? payload.text ?? "");
    }
  }

  return copyToClipboard(payload.url ?? payload.text ?? "");
}

export async function copyToClipboard(text: string): Promise<ShareOutcome> {
  if (!text) return "failed";

  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    // WKWebView denies navigator.clipboard outside a live user gesture; the
    // legacy execCommand path still works there.
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(area);
      return ok ? "copied" : "failed";
    } catch {
      return "failed";
    }
  }
}

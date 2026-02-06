import React from "react";

/**
 * Creates a small <img> element for use as a toast notification icon.
 * Sonner's `icon` prop accepts ReactNode.
 */
export function toastIcon(src: string): React.ReactNode {
  return React.createElement("img", {
    src,
    className: "w-6 h-6 object-contain",
    alt: "",
  });
}

// Barrel: commonly used 3D icon URLs from Supabase icon library
const ICON_BASE = "https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/icon-library";

export const ICON_URLS = {
  partyPopper: `${ICON_BASE}/party-popper.png`,
  crown: `${ICON_BASE}/crown.png`,
  gift: `${ICON_BASE}/gift.png`,
  box: `${ICON_BASE}/box.png`,
  confetti: `${ICON_BASE}/confetti.png`,
  questionMark: `${ICON_BASE}/question-mark.png`,
  bullseye: `${ICON_BASE}/bullseye.png`,
  headphones: `${ICON_BASE}/headphones.png`,
  sword: `${ICON_BASE}/sword.png`,
  sparkle: `${ICON_BASE}/sparkle.png`,
  team: `${ICON_BASE}/team.png`,
  crane: `${ICON_BASE}/crane.png`,
  target: `${ICON_BASE}/target.png`,
  joystick: `${ICON_BASE}/joystick.png`,
  fail: `${ICON_BASE}/fail.png`,
  brokenHeart: `${ICON_BASE}/broken-heart.png`,
  thumbsDown: `${ICON_BASE}/thumbs-down.png`,
  trophy: `${ICON_BASE}/trophy.png`,
} as const;

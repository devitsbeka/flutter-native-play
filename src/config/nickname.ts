/**
 * How long a display name may be.
 *
 * Ten characters, because the name is drawn beside other things far more
 * often than it is drawn alone: the profile hero puts a flag, a crown and an
 * edit pencil on the same line as it, a room card's host label truncates at
 * 104px, and the friends reel gives each face 64px to write a name under. A
 * twenty-character name fits none of those and was simply cut off wherever it
 * appeared (owner: "username max chars must be 10 chars").
 *
 * One number, read by every field that takes a name — the sign-up form
 * included. A cap enforced only where the name is edited is not a cap: it
 * leaves the long name that was typed at sign-up in place, and the screens
 * that truncate it never see the difference.
 *
 * Names already longer than this are left alone. Nothing renames anybody;
 * the limit applies to what can be typed from here on.
 */
export const NICKNAME_MAX_CHARS = 10;

/**
 * A name trimmed and cut to the limit, for the save path.
 *
 * `maxLength` on the input stops it being typed; this stops it being pasted,
 * autofilled, or carried in from a draft written before the limit existed.
 * It counts the same units `maxLength` does, so the two never disagree.
 */
export function clampNickname(value: string): string {
  return value.trim().slice(0, NICKNAME_MAX_CHARS);
}

/**
 * The join code inside whatever a QR code turned out to contain.
 *
 * Pulled out of the scanner so it can be tested without a camera: the decode
 * callback fires fifteen times a second on whatever happens to be in frame,
 * and everything it hands us is a stranger's string.
 *
 * Three shapes are accepted, all of which the app itself produces:
 *   https://mytrivia.io/join?code=ABC123
 *   https://mytrivia.io/join/ABC123
 *   ABC123
 */
export function joinCodeFromQr(decodedText: string): string | null {
  const text = decodedText.trim();
  if (!text) return null;

  const plain = (value: string) =>
    /^[A-Z0-9]{4,8}$/i.test(value) ? value.toUpperCase() : null;

  if (text.includes("/join")) {
    try {
      const url = new URL(text);
      const fromQuery = url.searchParams.get("code");
      if (fromQuery) return plain(fromQuery.trim());

      const fromPath = url.pathname.match(/\/join\/([A-Z0-9]+)/i);
      if (fromPath) return plain(fromPath[1]);
      return null;
    } catch {
      // Not a URL after all — a bare code containing "/join" cannot be one
      // either, so this falls through to the plain check below.
    }
  }

  return plain(text);
}

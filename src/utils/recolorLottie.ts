/**
 * Recursively traverse a Lottie JSON object and replace color values.
 * Colors in Lottie are stored as [r, g, b, a] arrays with values 0-1.
 * This function matches colors by proximity (tolerance) and replaces them.
 */

type ColorMap = Array<{ from: [number, number, number]; to: [number, number, number] }>;

function hexToRgb01(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255,
  ];
}

function colorsMatch(a: number[], from: [number, number, number], tolerance = 0.02): boolean {
  if (a.length < 3) return false;
  return (
    Math.abs(a[0] - from[0]) < tolerance &&
    Math.abs(a[1] - from[1]) < tolerance &&
    Math.abs(a[2] - from[2]) < tolerance
  );
}

function traverseAndReplace(obj: any, colorMap: ColorMap): any {
  if (Array.isArray(obj)) {
    // Check if this looks like a color array [r, g, b, a] with values 0-1
    if (
      obj.length >= 3 &&
      obj.length <= 4 &&
      typeof obj[0] === 'number' &&
      typeof obj[1] === 'number' &&
      typeof obj[2] === 'number' &&
      obj[0] >= 0 && obj[0] <= 1 &&
      obj[1] >= 0 && obj[1] <= 1 &&
      obj[2] >= 0 && obj[2] <= 1
    ) {
      for (const mapping of colorMap) {
        if (colorsMatch(obj, mapping.from)) {
          const result = [mapping.to[0], mapping.to[1], mapping.to[2]];
          if (obj.length === 4) result.push(obj[3]);
          return result;
        }
      }
    }
    return obj.map((item: any) => traverseAndReplace(item, colorMap));
  }
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = traverseAndReplace(obj[key], colorMap);
    }
    return result;
  }
  return obj;
}

export function recolorLottie(
  animationData: any,
  replacements: Array<{ from: string; to: string }>
): any {
  const colorMap: ColorMap = replacements.map(r => ({
    from: hexToRgb01(r.from),
    to: hexToRgb01(r.to),
  }));
  return traverseAndReplace(JSON.parse(JSON.stringify(animationData)), colorMap);
}

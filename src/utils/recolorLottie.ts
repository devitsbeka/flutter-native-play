/**
 * Recursively traverse a Lottie JSON and replace fill/stroke colors.
 * Handles both static and animated color properties.
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

function colorsMatch(a: number[], from: [number, number, number], tolerance = 0.05): boolean {
  if (a.length < 3) return false;
  return (
    Math.abs(a[0] - from[0]) < tolerance &&
    Math.abs(a[1] - from[1]) < tolerance &&
    Math.abs(a[2] - from[2]) < tolerance
  );
}

function replaceColorArray(arr: number[], colorMap: ColorMap): number[] {
  for (const mapping of colorMap) {
    if (colorsMatch(arr, mapping.from)) {
      const result = [mapping.to[0], mapping.to[1], mapping.to[2]];
      if (arr.length === 4) result.push(arr[3]);
      return result;
    }
  }
  return arr;
}

function traverseAndReplace(obj: any, colorMap: ColorMap, parentKey?: string): any {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    // If parent key is "k" and this looks like a color array [r,g,b] or [r,g,b,a]
    if (
      parentKey === 'k' &&
      obj.length >= 3 &&
      obj.length <= 4 &&
      typeof obj[0] === 'number' &&
      typeof obj[1] === 'number' &&
      typeof obj[2] === 'number' &&
      obj.every((v: any) => typeof v === 'number')
    ) {
      return replaceColorArray(obj, colorMap);
    }

    // If parent key is "k" and this is an array of keyframes (animated color)
    if (parentKey === 'k' && obj.length > 0 && typeof obj[0] === 'object' && obj[0] !== null) {
      return obj.map((item: any) => {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          const newItem = { ...item };
          // "s" = start value, "e" = end value in keyframes
          if (Array.isArray(newItem.s) && newItem.s.length >= 3 && newItem.s.length <= 4 &&
              newItem.s.every((v: any) => typeof v === 'number')) {
            newItem.s = replaceColorArray(newItem.s, colorMap);
          }
          if (Array.isArray(newItem.e) && newItem.e.length >= 3 && newItem.e.length <= 4 &&
              newItem.e.every((v: any) => typeof v === 'number')) {
            newItem.e = replaceColorArray(newItem.e, colorMap);
          }
          return newItem;
        }
        return traverseAndReplace(item, colorMap);
      });
    }

    return obj.map((item: any) => traverseAndReplace(item, colorMap));
  }

  if (typeof obj === 'object') {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = traverseAndReplace(obj[key], colorMap, key);
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

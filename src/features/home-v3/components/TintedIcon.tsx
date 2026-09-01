import type { CSSProperties } from "react";
import type { IconTint } from "../tint";

interface TintedIconProps {
  src: string;
  tint: IconTint;
  /** Box the icon is fitted into (object-contain). */
  width: number;
  height: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * A bundled 3D PNG recoloured into one hue. See `IconTint`.
 *
 * The box is masked to the picture's alpha and painted the tint; the picture
 * itself sits on top in grayscale with `mix-blend-mode: luminosity`, which
 * keeps its light and shade and takes the hue and saturation from the flat
 * colour under it.
 */
export function TintedIcon({ src, tint, width, height, className, style }: TintedIconProps) {
  const mask: CSSProperties = {
    WebkitMaskImage: `url(${src})`,
    maskImage: `url(${src})`,
    WebkitMaskSize: "contain",
    maskSize: "contain",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
  };
  return (
    <div
      className={className}
      aria-hidden
      style={{ width, height, background: tint.color, isolation: "isolate", ...mask, ...style }}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          objectFit: "contain",
          filter: `grayscale(1) brightness(${tint.luma ?? 1}) contrast(${tint.contrast ?? 1})`,
          mixBlendMode: "luminosity",
        }}
      />
    </div>
  );
}

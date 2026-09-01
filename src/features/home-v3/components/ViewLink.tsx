import { V3 } from "../theme";
import { ArrowRightIcon } from "./Icons";

interface ViewLinkProps {
  label: string;
  onClick: () => void;
  color?: string;
  /** 16px medium under the rows; 17px bold in the PRO hero and the footer. */
  size?: number;
  weight?: number;
}

/** "→ View collection": thin arrow, 10px, the words. */
export function ViewLink({ label, onClick, color = V3.ink, size = 16, weight = 500 }: ViewLinkProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center active:opacity-70"
      style={{ color, gap: 10, fontFamily: V3.font, fontSize: size, fontWeight: weight, lineHeight: "20px", WebkitTapHighlightColor: "transparent" }}
    >
      <ArrowRightIcon size={22} strokeWidth={1.9} />
      <span>{label}</span>
    </button>
  );
}

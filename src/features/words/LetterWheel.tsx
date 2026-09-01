import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

/**
 * The letter wheel: a dark disc with the level's letters around its rim.
 *
 * Drag from letter to letter to spell a word; a line follows the finger
 * through every letter it has collected. Lifting the finger submits. Dragging
 * back onto the previous letter un-collects the last one, which is how a
 * slip is corrected without starting over.
 *
 * Tapping works too, for a mouse or a cautious thumb: each tap adds a letter,
 * tapping the last letter again submits, tapping the disc clears.
 */

export interface WheelLetter {
  /** Stable across shuffles, so a letter can animate to its new seat. */
  id: number;
  ch: string;
}

interface Props {
  letters: WheelLetter[];
  size: number;
  accent: string;
  disc: string;
  disabled?: boolean;
  onChange: (selected: number[]) => void;
  onSubmit: (selected: number[]) => void;
}

export function LetterWheel({ letters, size, accent, disc, disabled, onChange, onSubmit }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const gesture = useRef<{ visited: number; startedOnLast: boolean } | null>(null);

  const letterSize = letters.length >= 7 ? size * 0.2 : letters.length === 6 ? size * 0.22 : size * 0.24;
  const radius = size / 2 - letterSize / 2 - size * 0.06;
  const center = size / 2;

  const seats = useMemo(
    () =>
      letters.map((_, i) => {
        const angle = -Math.PI / 2 + (i / letters.length) * Math.PI * 2;
        return { x: center + radius * Math.cos(angle), y: center + radius * Math.sin(angle) };
      }),
    [letters, center, radius],
  );

  const update = useCallback(
    (next: number[]) => {
      setSelected(next);
      onChange(next);
    },
    [onChange],
  );

  const clear = useCallback(() => {
    setSelected([]);
    setPointer(null);
    gesture.current = null;
    onChange([]);
  }, [onChange]);

  // A new level or a shuffle re-seats the letters; nothing selected survives.
  useEffect(() => {
    setSelected([]);
    setPointer(null);
    gesture.current = null;
  }, [letters]);

  const localPoint = (e: React.PointerEvent) => {
    const rect = ref.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const hitTest = (p: { x: number; y: number }): number | null => {
    const reach = letterSize * 0.62;
    let best: number | null = null;
    let bestD = Infinity;
    seats.forEach((s, i) => {
      const d = Math.hypot(s.x - p.x, s.y - p.y);
      if (d < reach && d < bestD) {
        best = i;
        bestD = d;
      }
    });
    return best;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    const p = localPoint(e);
    const hit = hitTest(p);
    ref.current?.setPointerCapture(e.pointerId);
    if (hit === null) {
      clear();
      return;
    }
    const last = selected[selected.length - 1];
    gesture.current = { visited: 1, startedOnLast: last === hit };
    setPointer(p);
    if (!selected.includes(hit)) update([...selected, hit]);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!gesture.current) return;
    const p = localPoint(e);
    setPointer(p);
    const hit = hitTest(p);
    if (hit === null) return;
    const last = selected[selected.length - 1];
    if (hit === last) return;
    // Back onto the letter before the last: the last one was a slip.
    if (selected.length >= 2 && hit === selected[selected.length - 2]) {
      gesture.current.visited += 1;
      update(selected.slice(0, -1));
      return;
    }
    if (selected.includes(hit)) return;
    gesture.current.visited += 1;
    update([...selected, hit]);
  };

  const onPointerUp = () => {
    const g = gesture.current;
    gesture.current = null;
    setPointer(null);
    if (!g) return;
    const dragged = g.visited > 1;
    if (dragged || g.startedOnLast) {
      if (selected.length > 0) onSubmit(selected);
      setSelected([]);
      onChange([]);
    }
  };

  const path = selected.map((i) => seats[i]);
  if (pointer && selected.length > 0) path.push(pointer);

  return (
    <div
      ref={ref}
      className="relative rounded-full select-none"
      style={{
        width: size,
        height: size,
        background: disc,
        boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.06), 0 10px 30px rgba(0,0,0,0.25)",
        touchAction: "none",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="group"
      aria-label="Letter wheel"
    >
      <svg className="absolute inset-0 pointer-events-none" width={size} height={size} aria-hidden>
        {path.length > 1 && (
          <polyline
            points={path.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={accent}
            strokeWidth={Math.max(8, letterSize * 0.16)}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.95}
          />
        )}
      </svg>

      {letters.map((l, i) => {
        const on = selected.includes(i);
        return (
          <motion.div
            key={l.id}
            layout
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="absolute flex items-center justify-center rounded-full font-extrabold text-white"
            style={{
              width: letterSize,
              height: letterSize,
              left: seats[i].x - letterSize / 2,
              top: seats[i].y - letterSize / 2,
              fontSize: letterSize * 0.62,
              lineHeight: 1,
              background: on ? accent : "transparent",
              boxShadow: on ? "0 4px 12px rgba(0,0,0,0.3)" : "none",
              transitionProperty: "background-color, box-shadow",
              transitionDuration: "120ms",
              fontFamily: "'Nunito', sans-serif",
            }}
            aria-label={l.ch}
          >
            {l.ch}
          </motion.div>
        );
      })}
    </div>
  );
}

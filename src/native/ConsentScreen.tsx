import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The layout both permission pre-prompts use.
 *
 * There are two of these screens now — tracking and notifications — and they
 * are the same screen with different words. Extracting the shell is what keeps
 * them that way: a change to the insets, the type scale or the button happens
 * once, and the second screen cannot quietly drift into a different look the
 * way the first one did.
 *
 * ## The vocabulary is Settings'
 *
 * Nothing here defines a colour. `bg-background` on the page, the
 * `rounded-xl bg-card border border-border` row and the
 * `w-12 h-12 rounded-xl bg-<accent>/10` icon tile are lifted from
 * `pages/Settings.tsx`, text is `foreground` / `muted-foreground`, and the
 * action is the shared `<Button>`.
 *
 * ## Insets
 *
 * `safe-screen`, not `safe-bleed`. Both look plausible on a full-screen
 * element and only one is right: `safe-bleed` cancels **#root's** padding with
 * a negative margin before re-applying it, and a `fixed inset-0` element is
 * positioned against the viewport, so it never received that padding to
 * cancel. The margin therefore pulled the contents up by `--safe-top` and the
 * padding put them back — a net zero that left the icon under the status bar.
 * `safe-screen` exists for exactly this case (see the utilities in index.css).
 *
 * Padding classes stay off that element: the safe utilities are written as
 * doubled selectors and would silently discard them —
 * `src/__tests__/repo-invariants.test.ts` fails the combination.
 *
 * Scrolling is its own: `nativeShell.ts` disables the webview's document
 * scroller for the life of the app, so a screen that merely grows is frozen on
 * the device (see CLAUDE.md §4b). The content column scrolls inside the box
 * and the action stays pinned below it.
 */

export interface ConsentPoint {
  icon: LucideIcon;
  /** Tailwind class for the tile behind the icon, e.g. "bg-primary/10". */
  tile: string;
  /** Tailwind class for the icon itself, e.g. "text-primary". */
  mark: string;
  title: string;
  body: string;
}

interface ConsentScreenProps {
  open: boolean;
  icon: LucideIcon;
  titleId: string;
  title: string;
  body: string;
  points: readonly ConsentPoint[];
  actionLabel: string;
  footnote: string;
  onAction: () => void;
}

export function ConsentScreen({
  open,
  icon: Icon,
  titleId,
  title,
  body,
  points,
  actionLabel,
  footnote,
  onAction,
}: ConsentScreenProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[10000] flex flex-col bg-background safe-screen"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          {/* Scrolls itself — the document cannot. */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-6 pb-2">
            <div className="mx-auto w-full max-w-[700px] md:max-w-[600px]">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Icon className="h-8 w-8 text-primary" />
              </div>

              <h2
                id={titleId}
                className="mt-5 text-center font-display text-2xl font-bold leading-tight text-foreground"
              >
                {title}
              </h2>

              <p className="mx-auto mt-2 max-w-[34ch] text-center text-muted-foreground">
                {body}
              </p>

              <ul className="mt-6 space-y-2">
                {points.map(({ icon: PointIcon, tile, mark, title: pointTitle, body: pointBody }) => (
                  <li
                    key={pointTitle}
                    className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
                  >
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tile}`}
                    >
                      <PointIcon className={`h-6 w-6 ${mark}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block font-medium text-foreground">{pointTitle}</span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">{pointBody}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Pinned action. Always reachable, whatever the content height. */}
          <div className="shrink-0 px-4 pb-4 pt-2">
            <div className="mx-auto w-full max-w-[700px] md:max-w-[600px]">
              <Button size="lg" className="w-full" onClick={onAction} autoFocus>
                {actionLabel}
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">{footnote}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

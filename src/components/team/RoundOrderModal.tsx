import { useEffect, useState } from "react";
import { motion, Reorder, useDragControls } from "framer-motion";
import { GripVertical, Plus, X } from "lucide-react";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { useLanguage } from "@/contexts/LanguageContext";
import type { QueueItem } from "@/hooks/useRoomCategoryQueue";

/**
 * The rounds a room will play, in the order it will play them.
 *
 * Picking more than one category has been possible for a while — the picker
 * takes several at once and `room_category_queue` holds them in `position`
 * order, one row per round, consumed as each round finishes. What there was no
 * way to do was *look* at that list. The lobby's category chip showed the
 * room's single `category_name`, so three queued topics read as one, and
 * `reorderQueue` and `removeFromQueue` existed on the hook without anything
 * ever calling them.
 *
 * So this is the queue made visible: a round number against each topic, drag
 * to change which plays when, and a way to drop one or add more.
 *
 * ## Committed on release, not on every frame
 *
 * `Reorder` fires continuously while a row is under the finger, and each
 * change is a write per row. The local list follows the drag; the database
 * hears about it once, when the row is dropped.
 *
 * A guest sees the same list and cannot move it — the order is the host's, the
 * same as every other rule in the lobby.
 *
 * ## Round 1 is in the list too
 *
 * The round the room is HOLDING (game_rooms.category_id / user_trivia_id) is
 * not a queue row, and the first cut pinned it above the list — which left
 * the list numbered 1, 1, 2, 3 and made round 1 the one thing that could not
 * be changed by dragging (owner's screenshot). It is a row of the same list
 * now, numbered with the rest; drag any queued round above it and the lobby
 * promotes that round to the room and writes the old one into the queue
 * (`onPromote`).
 */

/** How many rows the list shows before it scrolls: 6 × 58 + 5 × 8 + 12 = 400px. */
export const LIST_MAX_ROWS = 6;

/** The round the room itself is holding, as a row of the list. */
export interface HeldEntry {
  id: typeof HELD_ID;
  kind: "held";
  name: string;
  iconSlug: string | null;
}
export const HELD_ID = "__held__";
export type RoundEntry = QueueItem | HeldEntry;
export const isHeld = (e: RoundEntry): e is HeldEntry => e.id === HELD_ID;

/** Queue rows plus the held round at the head, the way the room plays them. */
export function roundEntries(
  current: { name: string; iconSlug?: string | null } | null | undefined,
  items: QueueItem[],
): RoundEntry[] {
  const held: HeldEntry[] = current
    ? [{ id: HELD_ID, kind: "held", name: current.name, iconSlug: current.iconSlug ?? null }]
    : [];
  return [...held, ...items];
}

/**
 * What a drop means.
 *
 * Head still the held round (or no held round): a plain reorder of the
 * queue rows. Otherwise the new head is promoted to the room, and the queue
 * order names the old held round by the promoted row's id — that row is
 * rewritten in place to carry it (see useRoomCategoryQueue.replaceQueueItem).
 */
export function planDrop(order: RoundEntry[]):
  | { kind: "reorder"; queue: QueueItem[] }
  | { kind: "promote"; item: QueueItem; queueIds: string[] } {
  const head = order[0];
  const hasHeld = order.some(isHeld);
  if (!hasHeld || !head || isHeld(head)) {
    return { kind: "reorder", queue: order.filter((e): e is QueueItem => !isHeld(e)) };
  }
  return {
    kind: "promote",
    item: head,
    queueIds: order.slice(1).map((e) => (isHeld(e) ? head.id : e.id)),
  };
}

interface RoundOrderModalProps {
  open: boolean;
  onClose: () => void;
  items: QueueItem[];
  /**
   * The round the room is already holding, when that is what plays first.
   *
   * It is not a queue row — it lives on the room itself — so the list used to
   * leave it out entirely and number the queue from 1. It is round 1 of this
   * list: numbered with the rest, draggable, but with no X — there is no
   * queue row to delete.
   */
  current?: { name: string; iconSlug?: string | null } | null;
  /** The host orders the rounds; everyone else reads them. */
  canEdit: boolean;
  onReorder: (next: QueueItem[]) => void | Promise<unknown>;
  /**
   * A queued round was dropped above the held one: make it the room's, and
   * put the old held round in the queue where the drag left it. `queueIds`
   * is the queue in its new order, naming the old held round by `item.id`.
   */
  onPromote?: (item: QueueItem, queueIds: string[]) => void | Promise<unknown>;
  onRemove: (id: string) => void | Promise<unknown>;
  /** Opens the picker, which already takes more than one at a time. */
  onAdd: () => void;
}

export function RoundOrderModal({
  open,
  items,
  current,
  canEdit,
  onReorder,
  onPromote,
  onRemove,
  onAdd,
}: RoundOrderModalProps) {
  const { t } = useLanguage();
  const [order, setOrder] = useState<RoundEntry[]>(() => roundEntries(current, items));
  const [dragging, setDragging] = useState(false);

  // Follow the room while nobody is dragging. Adopting a realtime update
  // mid-drag would pull the row out from under the finger.
  const currentName = current?.name ?? null;
  const currentIcon = current?.iconSlug ?? null;
  useEffect(() => {
    if (!dragging) setOrder(roundEntries(currentName ? { name: currentName, iconSlug: currentIcon } : null, items));
  }, [items, dragging, currentName, currentIcon]);

  const handleDrop = () => {
    setDragging(false);
    const plan = planDrop(order);
    if (plan.kind === "reorder") void onReorder(plan.queue);
    else if (onPromote) void onPromote(plan.item, plan.queueIds);
    else void onReorder(plan.queueIds.map((id) => order.find((e) => e.id === id)).filter((e): e is QueueItem => !!e && !isHeld(e)));
  };

  // A panel, not a page: the lobby drops it under the category chip over a
  // blurred backdrop (UniversalLobby's categoryMenu), so it closes with a
  // tap anywhere and nobody leaves the lobby to read it. It used to be a
  // full screen of its own (owner: "shouldn't be a separate page").
  // After every hook: an early return above them threw "Rendered more
  // hooks than during the previous render" the moment `open` flipped.
  if (!open) return null;

  return (
    <>
        {/* No close button of its own: the + beside the chip turns into an
            X while this list is open, and the backdrop closes it too. Two
            X's, one above the other, was one too many (owner). */}
        <div className="flex flex-col items-center px-4 pb-2 pt-3">
          <h2 className="text-lg font-display text-primary">{t("lobby.uRoundsTitle")}</h2>
          {/* The hint lives up here, not in the scroller, so it does not
              scroll away and the scroller holds rows only — which is what
              its six-row cap is measured in. */}
          <p className="mt-1 text-center text-sm text-muted-foreground">
            {canEdit ? t("lobby.uRoundsHint") : t("lobby.uRoundsHintGuest")}
          </p>
        </div>

        {/* A flex column, so the scroller inside is sized by flex rather
            than by a percentage: the panel has a max-height, not a height,
            which makes "100%" indefinite and let the scroller grow to its
            content, past the panel's edge. */}
        <div className="relative flex min-h-0 flex-1 flex-col">
        {/* Six rows at most (owner's ask), then the rest scrolls under a
            finger anywhere but the grips. (It had paging arrows for a
            while, from when the whole row was the drag handle and could
            not scroll; the grip-only handle made them clutter.) */}
        <div className="min-h-0 max-h-[400px] flex-1 overflow-y-auto px-4 pb-3">
          <div className="mx-auto w-full max-w-[520px]">

            {/* The room's own round, when it has one: round 1, fixed. */}
            <Reorder.Group
              axis="y"
              values={order}
              onReorder={canEdit ? setOrder : () => {}}
              className="flex flex-col gap-2"
            >
              {order.map((entry, index) => (
                <RoundRow
                  key={entry.id}
                  entry={entry}
                  number={index + 1}
                  canEdit={canEdit}
                  onDragStart={() => setDragging(true)}
                  onDragEnd={handleDrop}
                  onRemove={isHeld(entry) ? undefined : () => void onRemove(entry.id)}
                  roundLabel={t("lobby.uRoundLabel", { count: index + 1 })}
                  gripLabel={t("lobby.uRoundsDrag")}
                  removeLabel={t("lobby.uRoundsRemove")}
                />
              ))}
            </Reorder.Group>

          </div>
        </div>

        </div>

        {/* Add sits UNDER the scroller, not in it.
            A twelve-round room pushed it off the bottom of the panel, so the
            one control this list exists to offer was the one thing you had to
            scroll a list of twelve to reach. The rounds scroll; this does not. */}
        {canEdit && (
          <div className="shrink-0 px-4 pb-4 pt-2">
            <div className="mx-auto w-full max-w-[520px]">
              <motion.button
                type="button"
                onClick={onAdd}
                whileTap={{ scale: 0.98 }}
                className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/50 bg-background/80 text-[15px] font-semibold text-primary backdrop-blur-sm"
              >
                <Plus className="h-5 w-5" />
                {t("lobby.uAddRounds")}
              </motion.button>
            </div>
          </div>
        )}
    </>
  );
}

/**
 * One round. The GRIP is the handle, and only the grip: the whole row used to
 * be, with touch-action: none on all of it, which made the list impossible to
 * scroll with a finger — every touch was a drag (owner). Now a finger on the
 * name or the number scrolls the list as any list scrolls, and the grip — a
 * 40px target, not the 20px glyph — starts the drag. The held round is a row
 * like the others, numbered and draggable; it just has no X, because there
 * is no queue row to delete.
 */
function RoundRow({
  entry,
  number,
  canEdit,
  onDragStart,
  onDragEnd,
  onRemove,
  roundLabel,
  gripLabel,
  removeLabel,
}: {
  entry: RoundEntry;
  number: number;
  canEdit: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onRemove?: () => void;
  roundLabel: string;
  gripLabel: string;
  removeLabel: string;
}) {
  const controls = useDragControls();
  // Lit from the moment the grip is pressed, not from the first movement:
  // the press itself should say "this will move", so the row lifts —
  // scale, a purple halo, a deep shadow — under the finger and settles
  // when it is let go.
  const [lifted, setLifted] = useState(false);
  const name = isHeld(entry) ? entry.name : entry.category_name;
  const iconSlug = (isHeld(entry) ? entry.iconSlug : entry.icon_slug) || "mystery-box";

  return (
    <Reorder.Item
      value={entry}
      dragListener={false}
      dragControls={controls}
      onDragStart={onDragStart}
      onDragEnd={() => {
        setLifted(false);
        onDragEnd();
      }}
      animate={
        lifted
          ? { scale: 1.03, boxShadow: "0 0 0 2px rgba(113,38,213,0.45), 0 18px 40px rgba(102,51,153,0.32)" }
          : { scale: 1, boxShadow: "0 0 0 0px rgba(113,38,213,0), 0 0 0 rgba(102,51,153,0)" }
      }
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      style={{ zIndex: lifted ? 10 : undefined }}
      className={`relative flex min-h-[58px] items-center gap-2 rounded-xl border bg-white/70 py-2 pl-1 pr-1 ${
        lifted ? "border-[#7126d5]/40 bg-white" : "border-border/50"
      }`}
    >
      {/* The X leads the row, before the number, away from the grip on the
          far right — it sat beside the grip, where a thumb reaching for
          the drag handle removed the round instead (owner). The held round
          has no X; it keeps the slot so the numbers line up. */}
      {canEdit && (
        onRemove ? (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onRemove}
            aria-label={removeLabel}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        ) : (
          <span className="h-9 w-9 shrink-0" />
        )
      )}
      <span className="w-5 shrink-0 text-center font-[Nunito] text-[13px] font-bold text-muted-foreground">
        {number}
      </span>

      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10">
        <DynamicIcon slug={iconSlug} size={22} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-foreground">
          {name}
        </span>
        <span className="block text-xs text-muted-foreground">{roundLabel}</span>
      </span>

      {canEdit && (
        <span
          role="button"
          aria-label={gripLabel}
          onPointerDown={(e) => {
            setLifted(true);
            controls.start(e);
          }}
          style={{ touchAction: "none" }}
          className={`flex h-10 w-10 shrink-0 cursor-grab items-center justify-center rounded-full transition-colors active:cursor-grabbing ${
            lifted ? "bg-[#7126d5]/10 text-[#7126d5]" : "text-muted-foreground/60"
          }`}
        >
          <GripVertical className="h-5 w-5" />
        </span>
      )}
    </Reorder.Item>
  );
}

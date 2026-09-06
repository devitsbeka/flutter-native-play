import { useEffect, useState } from "react";
import { AnimatePresence, motion, Reorder, useDragControls } from "framer-motion";
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
 */

interface RoundOrderModalProps {
  open: boolean;
  onClose: () => void;
  items: QueueItem[];
  /**
   * The round the room is already holding, when that is what plays first.
   *
   * It is not a queue row — it lives on the room itself — so the list used to
   * leave it out entirely and number the queue from 1. That made the lobby's
   * chip and this list disagree about which category opens the game, and
   * about how many rounds there are: the chip counted this one, the list did
   * not. Pinned at the top, not draggable and not removable, because there is
   * no queue row to move or delete.
   */
  current?: { name: string; iconSlug?: string | null } | null;
  /** The host orders the rounds; everyone else reads them. */
  canEdit: boolean;
  onReorder: (next: QueueItem[]) => void | Promise<unknown>;
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
  onRemove,
  onAdd,
}: RoundOrderModalProps) {
  const { t } = useLanguage();
  const [order, setOrder] = useState<QueueItem[]>(items);
  const [dragging, setDragging] = useState(false);

  // Follow the room while nobody is dragging. Adopting a realtime update
  // mid-drag would pull the row out from under the finger.
  useEffect(() => {
    if (!dragging) setOrder(items);
  }, [items, dragging]);

  if (!open) return null;

  // A panel, not a page: the lobby drops it under the category chip over a
  // blurred backdrop (UniversalLobby's categoryMenu), so it closes with a
  // tap anywhere and nobody leaves the lobby to read it. It used to be a
  // full screen of its own (owner: "shouldn't be a separate page").
  return (
    <>
        {/* No close button of its own: the + beside the chip turns into an
            X while this list is open, and the backdrop closes it too. Two
            X's, one above the other, was one too many (owner). */}
        <div className="flex items-center justify-center px-4 pb-1 pt-3">
          <h2 className="text-lg font-display text-primary">{t("lobby.uRoundsTitle")}</h2>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
          <div className="mx-auto w-full max-w-[520px]">
            <p className="mb-3 text-center text-sm text-muted-foreground">
              {canEdit ? t("lobby.uRoundsHint") : t("lobby.uRoundsHintGuest")}
            </p>

            {/* The room's own round, when it has one: round 1, fixed. */}
            {current && (
              <div className="mb-2 flex items-center gap-3 rounded-xl bg-card px-3 py-3 shadow-sm">
                <span className="w-5 shrink-0 text-center text-sm font-bold tabular-nums text-muted-foreground">
                  1
                </span>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <DynamicIcon slug={current.iconSlug ?? undefined} size={26} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold text-foreground">
                    {current.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {t("lobby.uRoundLabel", { count: 1 })}
                  </span>
                </span>
              </div>
            )}

            <Reorder.Group
              axis="y"
              values={order}
              onReorder={canEdit ? setOrder : () => {}}
              className="flex flex-col gap-2"
            >
              {order.map((item, index) => (
                <RoundRow
                  key={item.id}
                  item={item}
                  index={index}
                  canEdit={canEdit}
                  onDragStart={() => setDragging(true)}
                  onDragEnd={() => {
                    setDragging(false);
                    void onReorder(order);
                  }}
                  onRemove={() => void onRemove(item.id)}
                  roundLabel={t("lobby.uRoundLabel", { count: index + 1 + (current ? 1 : 0) })}
                />
              ))}
            </Reorder.Group>

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
 * One round. The whole row is the handle on a phone — a 20px grip is a target
 * most thumbs miss — so the drag is started from the row and the grip is there
 * to say that it can be.
 */
function RoundRow({
  item,
  index,
  canEdit,
  onDragStart,
  onDragEnd,
  onRemove,
  roundLabel,
}: {
  item: QueueItem;
  index: number;
  canEdit: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onRemove: () => void;
  roundLabel: string;
}) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      whileDrag={{ scale: 1.02, boxShadow: "0 12px 28px rgba(102,51,153,0.18)" }}
      className="flex min-h-[64px] items-center gap-3 rounded-xl border border-border/50 bg-white/70 p-3"
      onPointerDown={(e) => {
        if (canEdit) controls.start(e);
      }}
      style={{ touchAction: canEdit ? "none" : undefined }}
    >
      <span className="w-6 shrink-0 text-center font-[Nunito] text-[13px] font-bold text-muted-foreground">
        {index + 1}
      </span>

      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10">
        {item.icon_slug ? (
          <DynamicIcon slug={item.icon_slug} size={22} />
        ) : (
          <DynamicIcon slug="mystery-box" size={22} />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-foreground">
          {item.category_name}
        </span>
        <span className="block text-xs text-muted-foreground">{roundLabel}</span>
      </span>

      {canEdit && (
        <>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onRemove}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
          <GripVertical className="h-5 w-5 shrink-0 text-muted-foreground/60" />
        </>
      )}
    </Reorder.Item>
  );
}

import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotifications } from "@/hooks/useNotifications";
import SpotlightSearch from "@/components/search/SpotlightSearch";
import { MyTriviaLiveLogo } from "@/components/shared/MyTriviaLiveLogo";
import triviaBuzzer from "@/assets/trivia-buzzer.png";
import iconCollections from "@/assets/icon-collections.png";
import iconGroupOfPeople from "@/assets/group-of-people.png";
import danceFloor from "@/assets/dance-floor.png";
import { DraftsList } from "./DraftsList";

/**
 * "What shall we create?" — Figma 1065:1019.
 *
 * A page, not a sheet: the app's own header (back, wordmark, search and
 * bell) over the lavender ground every screen wears, the question as a
 * heading, and three chunky glass cards — Trivia and Collection side by
 * side, My Trivia Party across the full width — with the saved drafts
 * listed below them.
 *
 * It used to be a purple sheet. Two doors open it: the hub's + on the
 * Private tab, where a game room is what most people came for, so the room
 * card leads there at full width (its own test says so); and the play
 * chooser's My Trivias tile, whose frame has no room card — that tile is
 * about making something — so the hub hides it for that entry.
 */

interface CreateTriviaTypeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectSingle: (draftId?: string) => void;
  onSelectCollection: (draftId?: string) => void;
  onSelectPersonal?: (draftId?: string) => void;
  /** The hub's private room, when this door offers one. */
  onSelectGameRoom?: () => void;
  /** Opened from the My Trivias tile: no room card on that frame. */
  hideGameRoom?: boolean;
}

export function CreateTriviaTypeModal({
  open,
  onOpenChange,
  onSelectSingle,
  onSelectCollection,
  onSelectPersonal,
  onSelectGameRoom,
  hideGameRoom = false,
}: CreateTriviaTypeModalProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();

  const handleResumeDraft = (draftId: string, type: "collection" | "trivia" | "personal") => {
    if (type === "trivia") {
      onSelectSingle(draftId);
    } else if (type === "personal") {
      onSelectPersonal?.(draftId);
    } else {
      onSelectCollection(draftId);
    }
  };

  const handleClose = () => onOpenChange(false);

  // The three things to make. Trivia and Collection share a row; the Party
  // takes the full width beneath them (its icon is the widest, and the
  // frame gives it the room).
  const cards: { key: string; icon: string; title: string; wide?: boolean; onPick: () => void }[] = [
    { key: "trivia", icon: triviaBuzzer, title: t("extra.triviaLabel"), onPick: () => onSelectSingle() },
    { key: "collection", icon: iconCollections, title: t("extra.collectionLabel"), onPick: () => onSelectCollection() },
    ...(onSelectPersonal
      ? [{ key: "personal", icon: iconGroupOfPeople, title: "My Trivia Party", wide: true, onPick: () => onSelectPersonal() }]
      : []),
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 26, stiffness: 300 }}
          // safe-screen: a fixed layer never receives #root's safe-area
          // padding, so the page adds its own — same contract every other
          // full-screen layer in the app is written against.
          className="fixed inset-0 safe-screen z-50 flex flex-col overflow-hidden bg-[#f3e6ff]"
        >
          {/* The soft ground the app's pages share: a lavender wash with two
              blurred blobs, as on the frame. */}
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute inset-0 bg-[linear-gradient(180deg,#f4e8ff_0%,#efe2ff_55%,#f3e6ff_100%)]" />
            <div className="absolute left-[-60px] top-[120px] h-[260px] w-[260px] rounded-full bg-[#d9c2ff] opacity-70 blur-[60px]" />
            <div className="absolute right-[-80px] top-[-40px] h-[300px] w-[300px] rounded-full bg-[#e2cdff] opacity-60 blur-[70px]" />
          </div>

          {/* Header — the app's own: back, wordmark, search and bell. */}
          <header className="relative z-20 shrink-0 px-4 py-3">
            <div className="mx-auto flex w-full max-w-[700px] items-center justify-between gap-3 md:max-w-[520px]">
              <button
                type="button"
                onClick={handleClose}
                aria-label={t("common.back")}
                className="rounded-full p-2 transition-colors hover:bg-white/30"
              >
                <ArrowLeft className="h-6 w-6 text-gray-600" />
              </button>
              <div className="flex min-w-0 flex-1 items-center justify-center">
                <button type="button" onClick={() => { handleClose(); navigate("/"); }} aria-label="MyTrivia" className="cursor-pointer">
                  <MyTriviaLiveLogo responsive />
                </button>
              </div>
              <div className="flex items-center gap-1">
                <SpotlightSearch variant="button" />
                <button
                  type="button"
                  onClick={() => { handleClose(); navigate("/notifications"); }}
                  className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/30"
                  aria-label={t("extra.notifications")}
                >
                  <Bell className="h-5 w-5 text-gray-600" />
                  {unreadCount > 0 && (
                    <span
                      className="absolute right-0.5 top-0.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
                      style={{
                        background: "linear-gradient(180deg, #EF4444 0%, #DC2626 100%)",
                        boxShadow: "0 2px 4px rgba(239, 68, 68, 0.5)",
                      }}
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </header>

          {/* The page scrolls itself (CLAUDE.md rule 4b). */}
          <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(24px_+_var(--safe-bottom))]">
            <div className="mx-auto w-full max-w-[700px] md:max-w-[520px]">
              <h1 className="pb-[18px] pt-[14px] font-hero text-[28px] leading-[34px] tracking-[-0.2px] text-[#402666]">
                {t("extra.whatToCreate")}
              </h1>

              {/* The room, first and full width, for the hub's door only. */}
              {onSelectGameRoom && !hideGameRoom && (
                <>
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      handleClose();
                      onSelectGameRoom();
                    }}
                    className="mb-[14px] flex h-[120px] w-full items-center gap-4 rounded-[24px] border-[1.5px] border-white/80 bg-[rgba(255,255,255,0.55)] px-5 text-left shadow-[0px_10px_28px_0px_rgba(88,50,160,0.12),inset_0px_1px_0px_0px_rgba(255,255,255,0.9)] backdrop-blur-xl"
                  >
                    <img src={danceFloor} alt="" draggable={false} className="h-[72px] w-[72px] shrink-0 object-contain drop-shadow-[0_6px_10px_rgba(88,50,160,0.18)]" />
                    <div className="min-w-0">
                      <h3 className="font-hero text-[20px] leading-[26px] tracking-[-0.16px] text-[#402666]">{t("extra.gameRoomLabel")}</h3>
                      <p className="mt-0.5 font-[Nunito] text-[13px] leading-[17px] text-[#6b5b86]">{t("extra.playWithFriends")}</p>
                    </div>
                  </motion.button>
                  <p className="mb-3 px-1 font-[Nunito] text-[12px] font-bold uppercase tracking-[0.06em] text-[#6b5b86]">
                    {t("extra.orCreateTrivia")}
                  </p>
                </>
              )}

              {/* Three chunky glass cards — 1065:1059 / 1062 / 1065. */}
              <div className="grid grid-cols-2 gap-[14px]">
                {cards.map((card, i) => (
                  <motion.button
                    key={card.key}
                    type="button"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * i, type: "spring", stiffness: 380, damping: 28 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      handleClose();
                      card.onPick();
                    }}
                    className={`flex h-[167px] flex-col items-center justify-center gap-[10px] rounded-[24px] border-[1.5px] border-white/80 bg-[rgba(255,255,255,0.55)] shadow-[0px_10px_28px_0px_rgba(88,50,160,0.12),inset_0px_1px_0px_0px_rgba(255,255,255,0.9)] backdrop-blur-xl ${
                      card.wide ? "col-span-2" : ""
                    }`}
                  >
                    <img src={card.icon} alt="" draggable={false} className="h-[92px] w-[92px] object-contain drop-shadow-[0_6px_10px_rgba(88,50,160,0.18)]" />
                    <span className="font-hero text-[18px] leading-[28px] tracking-[-0.16px] text-[#402666]">{card.title}</span>
                  </motion.button>
                ))}
              </div>

              {/* Saved drafts — the list carries its own small label. */}
              <div className="mt-[22px]">
                <DraftsList onResumeDraft={handleResumeDraft} onClose={handleClose} />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

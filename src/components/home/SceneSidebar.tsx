import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useGameInvitations } from "@/hooks/useGameInvitations";
import { useCategoryProgress } from "@/hooks/useCategoryProgress";
import { useCategories } from "@/hooks/useCategories";
import { useLanguage } from "@/contexts/LanguageContext";
import swordLine from "@/assets/figma-home/sword-line.svg";
import arrowRight from "@/assets/figma-home/arrow-right-s.svg";
import inviteAccept from "@/assets/figma-home/invite-accept.png";
import inviteDecline from "@/assets/figma-home/invite-decline.png";
import { useLocalizedCategoryName } from "@/utils/categoryDisplayName";

// Figma: Hom / node 601:1104 — right sidebar column (page x 1260, w 298):
// invite card, "continue playing" card, quick-play button. All three are
// live: real invitations, real category progress, real play action.
const CARD_SHADOW = "0px 2px 8px 0px rgba(102,51,153,0.06), 0px 8px 24px 0px rgba(102,51,153,0.12)";
// Card titles: the design's ExtraCondensed Georgian face renders squished
// in browsers, so titles use the app's regular Nunito bold instead.
const TITLE_STYLE: React.CSSProperties = {
  fontFamily: "'Nunito', sans-serif",
  fontWeight: 700,
};

interface SceneSidebarProps {
  onQuickPlay: () => void;
}

export function SceneSidebar({ onQuickPlay }: SceneSidebarProps) {
  const { t } = useLanguage();
  const localizeCategory = useLocalizedCategoryName();
  const navigate = useNavigate();
  const { pendingInvitations, acceptInvitation, declineInvitation } = useGameInvitations();
  const { progress } = useCategoryProgress();
  const { categories } = useCategories();
  const [inviteBusy, setInviteBusy] = useState(false);

  const invitation = pendingInvitations[0];

  // Top 3 categories to continue: in-progress ones first (most recently
  // played first), padded with the catalog's leading categories so the
  // card always has three rows.
  const continueRows = useMemo(() => {
    const byId = new Map(categories.map((c) => [c.id, c]));
    const inProgress = Object.values(progress)
      .filter((p) => p.completedLevels.length > 0 && byId.has(p.categoryId))
      .sort((a, b) => {
        const lastA = Math.max(...a.completedLevels.map((l) => new Date(l.completed_at).getTime()));
        const lastB = Math.max(...b.completedLevels.map((l) => new Date(l.completed_at).getTime()));
        return lastB - lastA;
      })
      .slice(0, 3)
      .map((p) => ({ category: byId.get(p.categoryId)!, level: p.currentLevel }));

    const used = new Set(inProgress.map((r) => r.category.id));
    for (const cat of categories) {
      if (inProgress.length >= 3) break;
      if (used.has(cat.id)) continue;
      inProgress.push({ category: cat, level: progress[cat.id]?.currentLevel || 1 });
      used.add(cat.id);
    }
    return inProgress.slice(0, 3);
  }, [progress, categories]);

  const handleAccept = async () => {
    if (!invitation || inviteBusy) return;
    setInviteBusy(true);
    const roomCode = await acceptInvitation(invitation.id);
    setInviteBusy(false);
    if (roomCode) navigate(`/team?join=${roomCode}`);
  };

  const handleDecline = async () => {
    if (!invitation || inviteBusy) return;
    setInviteBusy(true);
    await declineInvitation(invitation.id);
    setInviteBusy(false);
  };

  const categoryImage = (cat: { icon_slug?: string | null; image_url?: string | null }) =>
    cat.icon_slug
      ? `https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/icon-library/${cat.icon_slug}.png`
      : cat.image_url || null;

  return (
    <div className="flex w-[298px] flex-col gap-[15px]">
      {/* Invite card (node 601:1715) — only while an invitation is pending */}
      <AnimatePresence initial={false}>
        {invitation && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: -15 }}
            className="relative h-[115px] w-[298px] shrink-0 overflow-hidden rounded-[24px]"
            style={{
              background: "linear-gradient(to bottom, rgba(203,249,233,0.81), rgba(237,245,231,0.81))",
              boxShadow: CARD_SHADOW,
            }}
          >
            <p
              className="absolute left-[18px] top-[14px] text-[16px] uppercase leading-[16px] tracking-[-0.16px] text-[#402666] whitespace-nowrap"
              style={TITLE_STYLE}
            >
              {t("extra.sidebarInvitation")}
            </p>

            {/* Sender avatar (node 601:1738) */}
            <div className="absolute left-[16px] top-[43px] size-[48px]">
              <div
                className="absolute inset-0 flex flex-col items-start rounded-full p-[2.25px]"
                style={{ backgroundImage: "linear-gradient(135deg, rgb(148,163,184) 0%, rgb(203,213,225) 100%)" }}
              >
                <div className="flex size-[43.5px] flex-col items-start rounded-full bg-white p-[1.5px]">
                  <div className="size-[40.5px] overflow-hidden rounded-full">
                    {invitation.sender?.avatar_url ? (
                      <img
                        alt=""
                        className="size-[42px] max-w-none rounded-full object-cover pointer-events-none"
                        src={invitation.sender.avatar_url}
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-[#ebdbfe] font-['Nunito'] font-bold text-[18px] text-[#402666]">
                        {(invitation.sender?.nickname || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <p className="absolute left-[76px] top-[43px] w-[129px] text-[12px] leading-[18px] tracking-[-0.16px] text-[#402666]">
              <span className="font-['Nunito'] font-bold">{invitation.sender?.nickname || t("extra.friend")}</span>
              <span className="font-['Nunito'] font-semibold">{t("extra.sidebarInvitesYou")}</span>
            </p>
            {invitation.room?.category_name && (
              <p className="absolute left-[76px] top-[81px] w-[124px] truncate font-['Nunito'] text-[12px] leading-[19.73px] tracking-[-0.16px] text-[#402666] opacity-70">
                {localizeCategory(invitation.room.category_name)}
              </p>
            )}

            {/* Decline (node 601:1777) + accept (node 601:1787) */}
            <motion.button
              type="button"
              aria-label={t("extra.sidebarDecline")}
              onClick={handleDecline}
              disabled={inviteBusy}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.92 }}
              className="absolute left-[226px] top-[45px] size-[25.4px] rounded-full border-[0.71px] border-solid border-[#e8e0f5] bg-white shadow-[0px_1.72px_0px_0px_#d8d0e8,0px_2.58px_6.88px_0px_rgba(0,0,0,0.1)]"
            >
              <img alt="" className="absolute left-[4px] top-[4.5px] size-[17px] max-w-none pointer-events-none" src={inviteDecline} />
            </motion.button>
            <motion.button
              type="button"
              aria-label={t("extra.sidebarAccept")}
              onClick={handleAccept}
              disabled={inviteBusy}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              className="absolute left-[241px] top-[54px] size-[43px] rounded-full border border-solid border-[rgba(0,0,0,0.2)] bg-[#e0ede6]"
            >
              <img alt="" className="absolute left-[3px] top-[4px] h-[35px] w-[36px] max-w-none pointer-events-none" src={inviteAccept} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Continue playing card (node 612:1794) */}
      {continueRows.length > 0 && (
        <div
          className="relative w-[298px] shrink-0 overflow-hidden rounded-[24px] bg-[rgba(252,247,255,0.8)]"
          // Roomier card: rows start lower, sit 72px apart and leave a
          // bottom margin instead of ending flush with the edge
          style={{ height: 66 + continueRows.length * 72, boxShadow: CARD_SHADOW }}
        >
          <p
            className="absolute left-[18px] top-[16px] text-[14px] uppercase leading-[14px] tracking-[-0.16px] text-[#402666] whitespace-nowrap"
            style={TITLE_STYLE}
          >
            {t("extra.sidebarContinue")}
          </p>
          {continueRows.map((row, i) => {
            const img = categoryImage(row.category);
            return (
              <button
                key={row.category.id}
                type="button"
                onClick={() => navigate(`/category/${row.category.id}`)}
                className="group absolute left-0 h-[62px] w-full text-left"
                style={{ top: 52 + i * 72 }}
              >
                <div className="absolute left-[14px] top-[7px] size-[48px] overflow-hidden rounded-[12px]">
                  {img ? (
                    <img alt="" className="size-full max-w-none object-cover pointer-events-none" src={img} />
                  ) : (
                    <div className="flex size-full items-center justify-center bg-[#ebdbfe] text-[24px]">
                      {row.category.icon}
                    </div>
                  )}
                </div>
                <p className="absolute left-[72px] top-[13px] max-w-[180px] truncate font-['Nunito'] font-bold text-[12px] leading-[18px] tracking-[-0.16px] text-[#402666]">
                  {row.category.name}
                </p>
                <p className="absolute left-[72px] top-[32px] w-[124px] font-['Nunito'] text-[12px] leading-[19.73px] tracking-[-0.16px] text-[#402666] opacity-70">
                  {t("extra.sidebarLevelSuffix", { level: row.level })}
                </p>
                <div className="absolute right-[14px] top-[18px] size-[24px] rotate-180 opacity-[0.23] transition-opacity group-hover:opacity-60">
                  <img alt="" className="size-full max-w-none" src={arrowRight} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Quick play (node 612:1872) */}
      <motion.button
        type="button"
        onClick={onQuickPlay}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97, y: 2 }}
        className="relative flex h-[60px] w-[298px] shrink-0 items-center justify-center gap-3 rounded-[24px] border-[3px] border-solid border-[#34d399] px-[51px] shadow-[0px_6px_0px_0px_#047857,0px_10px_24px_0px_rgba(16,185,129,0.5)]"
      >
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none rounded-[20px]"
          style={{ backgroundImage: "linear-gradient(to bottom, #6ee7b7, #10b981 50%, #059669)" }}
        />
        <img alt="" className="relative size-[24px]" src={swordLine} />
        <p className="relative font-['Inter'] font-bold text-[14px] text-white drop-shadow-[0px_4px_3px_rgba(0,0,0,0.07)] whitespace-nowrap">
          {t("extra.sidebarQuickPlay")}
        </p>
        <div className="absolute left-[16.42px] top-[8.42px] size-[5.15px] rounded-full bg-white opacity-50" />
        <div className="absolute right-[97px] top-[17.36px] size-[5.28px] rounded-full bg-white opacity-35" />
        <div className="absolute left-[32.71px] top-[40.71px] size-[4.59px] rounded-full bg-[rgba(255,255,255,0.8)] opacity-60" />
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_3px_0px_0px_rgba(255,255,255,0.35)]" />
      </motion.button>
    </div>
  );
}

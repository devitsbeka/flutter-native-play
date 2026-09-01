import { useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Lock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCategories, type TransformedCategory } from "@/hooks/useCategories";
import { useCategoryProgress } from "@/hooks/useCategoryProgress";
import { useVipStatus } from "@/hooks/useVipStatus";
import { CategoryArtwork } from "@/components/shared/CategoryArtwork";
import { ProPaywallModal } from "@/components/pro/ProPaywallModal";
import { V3 } from "../theme";
import { findPath, pathCategories, pathStats } from "../paths";
import { RichText } from "../components/RichText";
import { TintedIcon } from "../components/TintedIcon";
import { GREY_TINT } from "../tint";
import { ChevronLeftIcon } from "../components/Icons";

import levelsIcon from "@/assets/icons/icon-map-3d.png";
import categoriesIcon from "@/assets/icon-collections.png";

/**
 * A path's own page — the reference's story-path screen on white paper: the
 * hero icon, the title, a grey chip, the level range, a folded description,
 * two stat tiles, and the categories in the path, each on its plinth with
 * the player's own progress under its name. A premium category wears the
 * PRO badge for a player without PRO and opens the paywall.
 */
export default function PathDetailV3() {
  const { pathId } = useParams<{ pathId: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { categories } = useCategories();
  const { getCategoryProgress } = useCategoryProgress();
  const { isVip } = useVipStatus();
  const [expanded, setExpanded] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);

  const path = findPath(pathId);
  const own = useMemo(() => (path ? pathCategories(path, categories) : []), [path, categories]);
  const stats = useMemo(() => (path ? pathStats(path, categories) : { categories: 0, levels: 0 }), [path, categories]);
  const maxLevels = useMemo(() => own.reduce((m, c) => Math.max(m, c.totalLevels || 0), 0), [own]);

  if (!path) return <Navigate to="/newui" replace />;

  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate("/newui"));
  const isLocked = (c: TransformedCategory) => !isVip && c.tier === "premium";
  const openCategory = (c: TransformedCategory) => (isLocked(c) ? setPaywallOpen(true) : navigate(`/category/${c.id}`));

  return (
    <div
      id="v3-detail"
      className="h-[100dvh] overflow-y-auto overflow-x-hidden scrollbar-hide safe-bleed"
      style={{ background: V3.detailBg, fontFamily: V3.font, color: V3.detailInk }}
    >
      <div className="mx-auto" style={{ maxWidth: V3.maxWidth, paddingBottom: 48 }}>
        {/* Back */}
        <button
          type="button"
          onClick={goBack}
          aria-label={t("extra.goBackLabel")}
          className="flex items-center justify-center active:opacity-60"
          style={{ marginLeft: 20, marginTop: 6, width: 36, height: 36, WebkitTapHighlightColor: "transparent" }}
        >
          <ChevronLeftIcon />
        </button>

        {/* Hero */}
        <div className="flex justify-center" style={{ marginTop: 30 }}>
          <TintedIcon src={path.icon} tint={path.theme.tint} width={230} height={211} style={{ transform: "scale(1.18)" }} />
        </div>

        <h1
          className="text-center"
          style={{ margin: "48px 32px 0", fontSize: 25, fontWeight: 700, lineHeight: "30px", letterSpacing: "-0.005em" }}
        >
          {t(`homeV3.path_${path.id}_title`)}
        </h1>

        <div className="flex justify-center" style={{ marginTop: 16 }}>
          <span
            style={{
              display: "inline-block",
              height: 32,
              padding: "0 16px",
              borderRadius: 10,
              background: V3.detailPill,
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 700,
              lineHeight: "32px",
              letterSpacing: "0.01em",
              textTransform: "uppercase",
            }}
          >
            {t(`homeV3.path_${path.id}_tag`)}
          </span>
        </div>

        <div className="text-center" style={{ marginTop: 10, color: V3.detailYears, fontSize: 18, fontWeight: 700, lineHeight: "24px" }}>
          {t("homeV3.levelRange", { from: 1, to: maxLevels })}
        </div>

        {/* Description */}
        <div
          className="relative"
          style={{ margin: "24px 32px 0", padding: "24px 24px 18px", borderRadius: 16, background: V3.detailCard }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 400,
              lineHeight: "24px",
              maxHeight: expanded ? "none" : 110,
              overflow: "hidden",
              ...(expanded
                ? {}
                : {
                    maskImage: "linear-gradient(180deg, #000 0, #000 76px, rgba(0,0,0,0.75) 96px, transparent 112px)",
                    WebkitMaskImage: "linear-gradient(180deg, #000 0, #000 76px, rgba(0,0,0,0.75) 96px, transparent 112px)",
                  }),
            }}
          >
            <RichText text={t(`homeV3.path_${path.id}_desc`)} />
          </div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={expanded ? "block ml-auto" : "absolute"}
            style={{
              ...(expanded ? { marginTop: 8 } : { right: 24, top: 24 + 96 }),
              fontSize: 12,
              fontWeight: 700,
              lineHeight: "24px",
              letterSpacing: "0.02em",
              textTransform: "uppercase",
              color: V3.detailInk,
              background: expanded ? "transparent" : V3.detailCard,
              paddingLeft: 6,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {expanded ? t("homeV3.less") : t("homeV3.more")}
          </button>
        </div>

        {/* Stats */}
        <div className="flex justify-between" style={{ margin: "29px 32px 0" }}>
          <StatTile icon={levelsIcon} label={t("homeV3.levelsStat")} value={stats.levels} />
          <StatTile icon={categoriesIcon} label={t("homeV3.categoriesStat")} value={stats.categories} />
        </div>

        {/* Categories */}
        <ul className="list-none m-0 p-0" style={{ marginTop: 56 }}>
          {own.map((c) => {
            const locked = isLocked(c);
            const current = Math.min(getCategoryProgress(c.id), c.totalLevels || 1);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => openCategory(c)}
                  className="flex items-center w-full text-left active:opacity-70"
                  style={{ height: 140, WebkitTapHighlightColor: "transparent" }}
                >
                  <div className="flex justify-end shrink-0" style={{ width: 268 }}>
                    <Plinth dim={locked}>
                      <CategoryArtwork categoryId={c.id} iconSlug={c.icon_slug} size={72} />
                    </Plinth>
                  </div>
                  <div style={{ marginLeft: 31, marginRight: 24, minWidth: 0 }}>
                    <div style={{ fontSize: 17, fontWeight: 700, lineHeight: "24px", color: "#000000" }}>{c.name}</div>
                    {locked ? (
                      <div
                        className="inline-flex items-center gap-1 rounded-full"
                        style={{
                          marginTop: 6,
                          height: 22,
                          padding: "0 8px",
                          background: "linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)",
                          color: "#ffffff",
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: "0.04em",
                        }}
                      >
                        <Lock className="w-3 h-3" strokeWidth={3} />
                        PRO
                      </div>
                    ) : (
                      <div style={{ marginTop: 2, fontSize: 14, fontWeight: 500, lineHeight: "18px", color: V3.muted }}>
                        {t("homeV3.levelOf", { current, total: c.totalLevels })}
                      </div>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <ProPaywallModal isOpen={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </div>
  );
}

/** Grey ring, grey icon, the label and the number: content-sized, 67 tall. */
function StatTile({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="flex items-center" style={{ height: 67, padding: "0 20px", borderRadius: 16, background: V3.detailCard, gap: 9 }}>
      <div className="flex items-center justify-center shrink-0" style={{ width: 48, height: 48, borderRadius: "50%", background: V3.detailRing }}>
        <div className="flex items-center justify-center" style={{ width: 38, height: 38, borderRadius: "50%", background: "#ececec" }}>
          <TintedIcon src={icon} tint={GREY_TINT} width={26} height={26} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 400, lineHeight: "18px", color: V3.muted }}>{label}</div>
        <div style={{ marginTop: 3, fontSize: 24, fontWeight: 700, lineHeight: "28px", color: V3.ink }}>{value}</div>
      </div>
    </div>
  );
}

/** The flat disc a category's icon stands on, 96 wide like the reference's. */
function Plinth({ dim = false, children }: { dim?: boolean; children: React.ReactNode }) {
  return (
    <div className="relative flex items-end justify-center" style={{ width: 96, height: 113 }}>
      <svg className="absolute bottom-0 left-0" width="96" height="46" viewBox="0 0 96 46" aria-hidden>
        <ellipse cx="48" cy="28" rx="47" ry="17" fill="#c9a17f" />
        <ellipse cx="48" cy="22" rx="47" ry="17" fill="#e9d6c4" />
        <ellipse cx="48" cy="22" rx="38" ry="12" fill="#d8b696" />
      </svg>
      <div className="relative" style={{ marginBottom: 14, ...(dim ? { filter: "grayscale(0.85)", opacity: 0.55 } : {}) }}>
        {children}
      </div>
    </div>
  );
}

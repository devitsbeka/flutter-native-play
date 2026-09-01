import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCategories } from "@/hooks/useCategories";
import { useVipStatus } from "@/hooks/useVipStatus";
import { useMissionStreak } from "@/hooks/useMissionStreak";
import { useFavorites } from "@/hooks/useFavorites";
import { ProPaywallModal } from "@/components/pro/ProPaywallModal";
import { CATEGORY_IMAGES } from "@/config/videoConfig";
import { V3 } from "../theme";
import { HOME_ROWS, PATHS, findPath, pathCategories, pathStats, startWithCategories } from "../paths";
import { promoIsLive } from "../promo";
import { V3Header } from "../components/V3Header";
import { SectionHeading } from "../components/SectionHeading";
import { PathCard } from "../components/PathCard";
import { StartWithBand } from "../components/StartWithBand";
import { ProHero } from "../components/ProHero";
import { ProBenefits } from "../components/ProBenefits";
import { PRO_BENEFITS } from "../proBenefits";
import { CategoryRow } from "../components/CategoryRow";
import { ViewAllCard } from "../components/ViewAllCard";
import { SaleBanner } from "../components/SaleBanner";
import { TabBar, type V3Tab } from "../components/TabBar";

/** The three faces in the closing band, in the order they fan. */
const VIEW_ALL_PICTURES = [
  CATEGORY_IMAGES.world_history,
  CATEGORY_IMAGES.geography,
  CATEGORY_IMAGES.science,
];

/**
 * The V3 home — the reference's "Stories" screen with MyTrivia's content in
 * it. Paths are groups of categories, stories are categories, chapters are
 * levels; PRO is PRO. Reachable at /v3 (and mytrivia://v3 on device) as a
 * preview alongside the current home, the same way /dev/v2 was.
 *
 * Scrolls itself: the document scroller is disabled on iOS (CLAUDE.md 4b),
 * and the two strips at the foot are fixed, so the page reserves their
 * height at its end rather than ending behind them.
 */
export default function HomeV3() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { categories } = useCategories();
  const { isVip } = useVipStatus();
  const { currentStreak } = useMissionStreak();
  const { favorites } = useFavorites();
  const [paywallOpen, setPaywallOpen] = useState(false);

  const showPromo = !isVip && promoIsLive();
  // What the fixed strips cover of the scroller: the scroller already stops
  // at the safe-area inset, and the tab bar reaches (inset − 6px) below its
  // own content, so the inset is subtracted back out.
  const chromeHeight = V3.tabBarHeight + (showPromo ? V3.saleBannerHeight : 0);
  const scrollerPadding = `calc(${chromeHeight}px + ${V3.tabBarInset} - var(--safe-bottom))`;

  const paths = useMemo(
    () => PATHS.map((p) => ({ path: p, stats: pathStats(p, categories) })).filter((p) => p.stats.categories > 0),
    [categories],
  );
  const startWith = useMemo(() => startWithCategories(categories), [categories]);
  const rows = useMemo(
    () =>
      HOME_ROWS.map((row) => ({
        ...row,
        categories: pathCategories(findPath(row.path)!, categories),
      })).filter((r) => r.categories.length > 0),
    [categories],
  );
  const totalCategories = categories.length;

  const benefits = useMemo(
    () => PRO_BENEFITS.map((b) => ({ id: b.id, icon: b.icon, title: t(b.titleKey), blurb: t(b.blurbKey) })),
    [t],
  );

  const openCategory = (id: string) => navigate(`/category/${id}`);
  const openPath = (id: string) => navigate(`/v3/path/${id}`);
  const openPaywall = () => setPaywallOpen(true);

  const onTab = (tab: V3Tab) => {
    if (tab === "home") {
      document.getElementById("v3-scroll")?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    navigate(tab === "explore" ? "/discover" : tab === "battle" ? "/team" : "/profile");
  };

  return (
    <>
      {/* The status-bar strip in the page's own colour — see PageHeader for
          why this has to be a portal rather than a margin. */}
      {typeof document !== "undefined" &&
        createPortal(
          <div aria-hidden className="fixed top-0 left-0 right-0 z-30 pointer-events-none" style={{ height: "var(--safe-top)", background: V3.bg }} />,
          document.body,
        )}

      <div
        id="v3-scroll"
        className="h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] overflow-y-auto overflow-x-hidden scrollbar-hide"
        style={{ background: V3.bg, fontFamily: V3.font, paddingBottom: scrollerPadding }}
      >
        <V3Header title={t("homeV3.title")} streak={currentStreak} favorites={favorites.size} />

        {/* Paths */}
        <section style={{ marginTop: 32 }}>
          <SectionHeading
            title={t("homeV3.pathsTitle")}
            badge={t("homeV3.pathsNew")}
            subtitle={t("homeV3.pathsSubtitle")}
            subtitleLineHeight={16}
            inset={25}
          />
          <div
            className="flex overflow-x-auto scrollbar-hide snap-x"
            style={{ gap: 32, paddingLeft: 24, paddingRight: 24, marginTop: 20, scrollPaddingLeft: 24 }}
          >
            {paths.map(({ path, stats }) => (
              <PathCard
                key={path.id}
                path={path}
                tag={t(`homeV3.path_${path.id}_tag`)}
                title={t(`homeV3.path_${path.id}_title`)}
                stats={stats}
                categoriesLabel={t("homeV3.categoriesUnit")}
                levelsLabel={t("homeV3.levelsUnit")}
                viewLabel={t("homeV3.view")}
                onClick={() => openPath(path.id)}
              />
            ))}
          </div>
        </section>

        {/* Categories to start with */}
        <div style={{ marginTop: 24 }}>
          <StartWithBand
            title={t("homeV3.startWithTitle")}
            categories={startWith}
            viewLabel={t("homeV3.viewCollection")}
            onCategory={openCategory}
            onView={() => openPath("pictures")}
          />
        </div>

        {/* PRO — for everyone who has not bought it */}
        {!isVip && (
          <>
            <div style={{ marginTop: 27 }}>
              <ProHero
                title={t("homeV3.proHeroTitle")}
                subtitle={t("homeV3.proHeroSubtitle")}
                cta={t("homeV3.proHeroCta")}
                onClick={openPaywall}
              />
            </div>
            <div style={{ marginTop: 32 }}>
              <ProBenefits title={t("homeV3.proBenefitsTitle")} items={benefits} onClick={openPaywall} />
            </div>
          </>
        )}

        {/* Rows */}
        <div className="flex flex-col" style={{ marginTop: 66, gap: 70 }}>
          {rows.map((row) => (
            <CategoryRow
              key={row.id}
              title={t(`homeV3.row_${row.id}_title`)}
              subtitle={t(`homeV3.row_${row.id}_subtitle`)}
              categories={row.categories}
              viewLabel={t("homeV3.viewCollection")}
              onCategory={openCategory}
              onView={() => openPath(row.path)}
            />
          ))}
        </div>

        <div style={{ marginTop: 50 }}>
          <ViewAllCard
            title={t("homeV3.viewAllTitle")}
            subtitle={t("homeV3.viewAllSubtitle", { count: totalCategories })}
            cta={t("homeV3.view")}
            pictures={VIEW_ALL_PICTURES}
            onClick={() => navigate("/discover")}
          />
        </div>
      </div>

      {showPromo && (
        <SaleBanner
          label={t("homeV3.promoLabel")}
          cta={t("homeV3.promoCta")}
          onClick={openPaywall}
          bottom={`calc(${V3.tabBarHeight}px + ${V3.tabBarInset})`}
        />
      )}
      <TabBar
        active="home"
        labels={{
          home: t("homeV3.tabHome"),
          explore: t("homeV3.tabExplore"),
          battle: t("homeV3.tabBattle"),
          profile: t("homeV3.tabProfile"),
        }}
        onSelect={onTab}
      />

      <ProPaywallModal isOpen={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </>
  );
}

import type { TransformedCategory } from "@/hooks/useCategories";
import { SectionHeading } from "./SectionHeading";
import { PortraitCard } from "./PortraitCard";
import { ViewLink } from "./ViewLink";

interface CategoryRowProps {
  title: string;
  subtitle: string;
  categories: Array<Pick<TransformedCategory, "id" | "name" | "icon_slug">>;
  viewLabel: string;
  onCategory: (id: string) => void;
  onView: () => void;
}

/**
 * A titled row of portrait cards with "→ View collection" under it. Heading,
 * then 18px, the cards, then 14px, the link — the reference's rhythm.
 */
export function CategoryRow({ title, subtitle, categories, viewLabel, onCategory, onView }: CategoryRowProps) {
  return (
    <section>
      <SectionHeading title={title} subtitle={subtitle} />
      <div
        className="flex overflow-x-auto scrollbar-hide snap-x"
        style={{ gap: 16, paddingLeft: 28, paddingRight: 28, marginTop: 18, scrollPaddingLeft: 28 }}
      >
        {categories.map((c) => (
          <PortraitCard key={c.id} category={c} onClick={() => onCategory(c.id)} />
        ))}
      </div>
      <div style={{ paddingLeft: 32, marginTop: 14 }}>
        <ViewLink label={viewLabel} onClick={onView} />
      </div>
    </section>
  );
}

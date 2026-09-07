import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/shared/PageHeader";
import { ExternalLink, ImageIcon, Search, Type, Code2, Palette } from "lucide-react";
import { ATTRIBUTIONS, ATTRIBUTION_COUNTS, type Attribution } from "@/data/attributions";

/**
 * Credits and attributions.
 *
 * The picture rounds — guess the celebrity, the city, the flag, the logo, the
 * film, the sportsman — are built from Wikimedia Commons images, and 734 of
 * them are offered under a Creative Commons BY or BY-SA licence. Naming the
 * work, its author and its licence is a term of those licences, not a
 * courtesy, and nothing in the app did it. This page does.
 *
 * The list is generated: `scripts/build-attributions.mjs` reads the round
 * specs in `scripts/popular-image-categories/spec/` and writes
 * `src/data/attributions.ts`. Re-run it whenever the picture rounds change,
 * so the credits follow the content instead of going stale.
 *
 * Everything on this page is inline English. The rest of the app translates
 * through `useLanguage`, and these strings want the same treatment — they are
 * listed in the review notes for whoever owns `src/locales/`.
 */

/** Where each licence's own terms live. */
const LICENSE_URLS: Record<string, string> = {
  "CC BY 2.0": "https://creativecommons.org/licenses/by/2.0/",
  "CC BY 2.5": "https://creativecommons.org/licenses/by/2.5/",
  "CC BY 3.0": "https://creativecommons.org/licenses/by/3.0/",
  "CC BY 3.0 at": "https://creativecommons.org/licenses/by/3.0/at/",
  "CC BY 3.0 br": "https://creativecommons.org/licenses/by/3.0/br/",
  "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/",
  "CC BY-SA 2.0": "https://creativecommons.org/licenses/by-sa/2.0/",
  "CC BY-SA 2.0 de": "https://creativecommons.org/licenses/by-sa/2.0/de/",
  "CC BY-SA 3.0": "https://creativecommons.org/licenses/by-sa/3.0/",
  "CC BY-SA 3.0 at": "https://creativecommons.org/licenses/by-sa/3.0/at/",
  "CC BY-SA 3.0 de": "https://creativecommons.org/licenses/by-sa/3.0/de/",
  "CC BY-SA 3.0 nl": "https://creativecommons.org/licenses/by-sa/3.0/nl/",
  "CC BY-SA 3.0 pl": "https://creativecommons.org/licenses/by-sa/3.0/pl/",
  "CC BY-SA 4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
  CC0: "https://creativecommons.org/publicdomain/zero/1.0/",
};

const TYPEFACES = [
  { name: "Inter", note: "Google Fonts · SIL Open Font License 1.1" },
  { name: "Nunito", note: "Google Fonts · SIL Open Font License 1.1" },
  { name: "Rubik", note: "Google Fonts · SIL Open Font License 1.1" },
  { name: "Noto Sans Georgian", note: "Google Fonts · SIL Open Font License 1.1" },
  { name: "Intel One Mono", note: "Google Fonts · SIL Open Font License 1.1" },
  { name: "Slackey", note: "Google Fonts · SIL Open Font License 1.1" },
  // Deliberately states only what is verifiable from the font file itself.
  //
  // The name table reads "Copyright (c) 2025 by Tural Alisoy. All rights
  // reserved." — a commercial face, and no licence for it is recorded anywhere
  // in this repo. Until somebody produces the app-embedding licence, this line
  // must not claim one exists: a credits page is exactly where an unverified
  // rights claim does damage. Replace this note with the real licence once the
  // paperwork is in hand, or replace the typeface.
  { name: "TA Solivare", note: "Georgian display face · © 2025 Tural Alisoy" },
];

const SOFTWARE = [
  { name: "React, React Router, TanStack Query", note: "MIT" },
  { name: "Tailwind CSS", note: "MIT" },
  { name: "Radix UI", note: "MIT" },
  { name: "Framer Motion", note: "MIT" },
  { name: "Lucide icons", note: "ISC" },
  { name: "Supabase JS", note: "MIT" },
  { name: "Capacitor", note: "MIT" },
  { name: "Three.js, React Three Fiber", note: "MIT" },
];

/** How many rows the list shows before you ask for more. */
const PAGE = 150;

function needsAttribution(license: string) {
  return /^CC BY(-SA)? /.test(license);
}

function AttributionRow({ item }: { item: Attribution }) {
  const licenseUrl = LICENSE_URLS[item.license];
  return (
    <li className="px-4 py-3 border-b border-border last:border-b-0">
      <a
        href={item.source}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-medium text-foreground hover:underline break-words"
      >
        {item.title}
      </a>
      <p className="text-xs text-muted-foreground mt-0.5 break-words">
        {item.author ? `by ${item.author}` : "author not stated on the source page"}
        {" · "}
        {licenseUrl ? (
          <a
            href={licenseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            {item.license}
          </a>
        ) : (
          item.license
        )}
        {item.subject ? ` · used for “${item.subject}”` : null}
      </p>
    </li>
  );
}

function Section({
  icon: Icon,
  title,
  children,
  delay = 0,
}: {
  icon: typeof ImageIcon;
  title: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-card rounded-2xl border border-border overflow-hidden"
    >
      <div className="flex items-center gap-3 p-4 pb-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <h2 className="font-display font-bold text-foreground">{title}</h2>
      </div>
      {children}
    </motion.section>
  );
}

export default function Credits() {
  const [query, setQuery] = useState("");
  const [onlyAttributionRequired, setOnlyAttributionRequired] = useState(false);
  const [shown, setShown] = useState(PAGE);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ATTRIBUTIONS.filter((item) => {
      if (onlyAttributionRequired && !needsAttribution(item.license)) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        (item.author ?? "").toLowerCase().includes(q) ||
        (item.subject ?? "").toLowerCase().includes(q) ||
        item.license.toLowerCase().includes(q)
      );
    });
  }, [query, onlyAttributionRequired]);

  const visible = filtered.slice(0, shown);

  return (
    // The document does not scroll on iOS (CLAUDE.md 4b) — the page is a
    // fixed-height box that scrolls itself.
    <div className="h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] overflow-y-auto bg-background">
      <PageHeader title="Credits" />

      <div className="p-4 pb-16 space-y-4 max-w-[700px] md:max-w-[600px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-5"
        >
          <h1 className="text-xl font-display font-bold text-foreground mb-2">
            Credits &amp; attributions
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            MyTrivia's picture rounds use photographs and logos published on Wikimedia
            Commons. Most are offered under a Creative Commons licence that asks us to
            name the work, its author and the licence. Every one of them is listed
            below, with a link to the page it came from.
          </p>
        </motion.div>

        <Section icon={Palette} title="MyTrivia's own artwork" delay={0.05}>
          <div className="px-4 pb-4 space-y-2 text-sm text-muted-foreground leading-relaxed">
            <p>
              The mascots, avatars, category art, icons, backgrounds and other in-app
              illustration were made for MyTrivia — drawn or generated for this app and
              owned by us. They are not stock photography and they do not depict real
              people. Profile pictures a player has not set are one of MyTrivia's own
              characters, dealt from the account id.
            </p>
            <p>
              Photographs uploaded by players — the source photo behind a generated
              avatar, a cover image — belong to the player who uploaded them and are
              covered by the Privacy Policy.
            </p>
          </div>
        </Section>

        <Section icon={Type} title="Typefaces" delay={0.1}>
          <ul className="px-4 pb-4 space-y-1.5">
            {TYPEFACES.map((font) => (
              <li key={font.name} className="text-sm">
                <span className="text-foreground font-medium">{font.name}</span>
                <span className="text-muted-foreground"> — {font.note}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={Code2} title="Open-source software" delay={0.15}>
          <div className="px-4 pb-4">
            <ul className="space-y-1.5 mb-3">
              {SOFTWARE.map((lib) => (
                <li key={lib.name} className="text-sm">
                  <span className="text-foreground font-medium">{lib.name}</span>
                  <span className="text-muted-foreground"> — {lib.note}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              A full dependency list ships with the app's source manifest.
            </p>
          </div>
        </Section>

        <Section icon={ImageIcon} title="Picture-round images" delay={0.2}>
          <div className="px-4 pb-4 space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {ATTRIBUTION_COUNTS.total.toLocaleString("en")} images from Wikimedia
              Commons, of which{" "}
              {ATTRIBUTION_COUNTS.attributionRequired.toLocaleString("en")} are under a
              Creative Commons licence that requires attribution. Works marked BY-SA are
              used unmodified; where an image is cropped for a round, the crop is offered
              under the same licence as the original.
            </p>

            <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
              {Object.entries(ATTRIBUTION_COUNTS.byLicense).map(([license, count]) => (
                <li key={license} className="text-xs flex justify-between gap-2">
                  <span className="text-muted-foreground truncate">{license}</span>
                  <span className="text-foreground font-mono tabular-nums">{count}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="px-4 pb-3 space-y-2 border-t border-border pt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShown(PAGE);
                }}
                placeholder="Search by title, author or licence"
                aria-label="Search image credits"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={onlyAttributionRequired}
                onChange={(e) => {
                  setOnlyAttributionRequired(e.target.checked);
                  setShown(PAGE);
                }}
                className="accent-primary"
              />
              Show only works that require attribution
            </label>
            <p className="text-xs text-muted-foreground">
              {filtered.length.toLocaleString("en")} shown
            </p>
          </div>

          {visible.length > 0 ? (
            <ul className="border-t border-border">
              {visible.map((item) => (
                <AttributionRow key={item.file} item={item} />
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center border-t border-border">
              Nothing matches that search.
            </p>
          )}

          {shown < filtered.length && (
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE)}
              className="w-full py-3 text-sm font-medium text-primary hover:bg-muted/50 transition-colors border-t border-border"
            >
              Show {Math.min(PAGE, filtered.length - shown)} more
            </button>
          )}
        </Section>

        <div className="text-center pt-2 space-y-1">
          <a
            href="https://commons.wikimedia.org/wiki/Commons:Licensing"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            About Wikimedia Commons licensing
            <ExternalLink className="w-3 h-3" />
          </a>
          <p className="text-xs text-muted-foreground">
            Something credited wrongly? Write to{" "}
            <a href="mailto:support@mytrivia.io" className="underline">
              support@mytrivia.io
            </a>{" "}
            and we will correct it.
          </p>
        </div>
      </div>
    </div>
  );
}

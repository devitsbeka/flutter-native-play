/**
 * Where the header's bell leads.
 *
 * In its own file rather than beside the component: exporting a constant and
 * a function from a component module breaks fast refresh for that module
 * (react-refresh/only-export-components), and this is shared by the header
 * and by the tests that pin its behaviour.
 */

/** The activity screen — what the bell opens, as a page of its own. */
export const ACTIVITY_PATH = "/notifications";

/**
 * Is the bell's destination the screen we are already on?
 *
 * One definition rather than a path compared in two places. Trailing slashes
 * are trimmed because a redirect or a hand-typed URL can leave one, and the
 * bell would go back to opening a second copy of the page.
 */
export function isOnActivityScreen(pathname: string): boolean {
  return pathname.replace(/\/+$/, "") === ACTIVITY_PATH;
}

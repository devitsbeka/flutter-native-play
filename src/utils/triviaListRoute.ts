/**
 * Where "your trivias" lives, written once.
 *
 * The rooms page opens on the Public tab, and its Private tab has a filter of
 * its own — so a link to the player's own trivias is not `/team`, it is
 * `/team` plus the tab plus the filter. Three screens already knew that and
 * the home rail's "All Trivias" did not, so it landed on the public list
 * instead (owner: "when i click 'all trivias' on main page it should take me
 * on online page and filter should show only trivias, now it goes to the
 * online page but on public tab").
 *
 * In its own file rather than beside a component: exporting a constant from a
 * component module breaks fast refresh for that module
 * (react-refresh/only-export-components), and this is shared by four callers
 * and the tests that pin them.
 */

/**
 * The Private tab with the Trivias filter applied — every standalone trivia
 * the player has made, parties included.
 *
 * TeamV2 reads both `tab` and `filter` off the URL, so this is enough to open
 * the list; it is also what the Back button restores, which is why the two
 * must not drift apart.
 */
export const MY_TRIVIAS_PATH = "/team?tab=private&filter=trivias";

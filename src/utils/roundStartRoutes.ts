/**
 * Which pages a starting round may pull a player away from.
 *
 * Waiting for a host is dead time and people wander off, so the room has to
 * come and get them. But being yanked out of a question you are answering is
 * worse than joining a round a second late, so a page that is itself a game
 * is left alone: /play is a solo quiz with its own clock and its own scoring,
 * and the TV routes are somebody's living-room game running on two devices.
 */
const DO_NOT_INTERRUPT = [
  "/play",
  "/game",
  "/tv",
  "/join",
  "/controller",
  // Games of their own, with their own clocks: being pulled out of a Team
  // Battle phase or a King think-timer is exactly the yank this list exists
  // to prevent. (/team-battle is NOT under /team segment-wise, so the
  // "already there" check above never covers it.)
  "/team-battle",
  "/king",
];

/**
 * Segment-wise, not string-wise. A plain startsWith would read /games-archive
 * as the game screen and /playlist as a quiz in progress, and would silently
 * refuse to bring those players into their round.
 */
function isUnder(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function isInterruptible(pathname: string): boolean {
  if (isUnder(pathname, "/team")) return false; // already there
  return !DO_NOT_INTERRUPT.some((base) => isUnder(pathname, base));
}

/**
 * Where a mission sends the player to actually work on it. Shared by the
 * missions sheet on the home screen and the streak page.
 */
// Where the CTA takes the player to actually work on a mission: category
// missions go to discover, friend missions open the create-room flow, the TV
// mission opens a room with TV mode pre-toggled, everything else (play, win,
// answers, perfect) starts from the "how do you want to play" chooser.
export function missionDestination(missionId: string): { to: string; state?: Record<string, unknown> } {
  switch (missionId) {
    case "play_categories":
    case "weekly_categories":
      return { to: "/discover" };
    // A mission naming one category opens that category, not the browser.
    case "category_movies":
      return { to: "/category/movies" };
    case "category_music":
      return { to: "/category/music" };
    case "category_animals":
      return { to: "/category/animals" };
    case "category_sports":
      return { to: "/category/sports" };
    case "category_cuisine":
      return { to: "/category/georgian_cuisine" };
    case "invite_to_play":
      return { to: "/create-room" };
    case "play_friend":
    case "weekly_friend_games":
      return { to: "/create-room" };
    case "play_tv":
      return { to: "/team", state: { openTV: true } };
    default:
      return { to: "/", state: { openPlayOptions: true } };
  }
}

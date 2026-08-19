/**
 * Feature switches for launch scope.
 *
 * PUBLIC_SHARING_ENABLED gates everything that lets users publish content to
 * strangers: the Explore tab on the team page, the Publish/Published buttons
 * on trivia and collection cards, the Public/Private visibility pickers in
 * the create and edit flows, and the visibility filter chips. For this launch
 * everything users create is private — playable alone or with invited
 * friends in a room — so the whole surface is hidden, not deleted. Flip this
 * to true to bring it all back.
 */
export const PUBLIC_SHARING_ENABLED = false;

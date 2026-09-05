import { MultiplayerProviderV2 } from "@/contexts/MultiplayerContextV2";
import { useSearchParams } from "react-router-dom";
import { CreateRoomPage, GAME_CHOICES, type GameChoice } from "@/components/team/CreateRoomPage";

/**
 * The create screen, on a route of its own.
 *
 * ## Why it needed one
 *
 * It used to be reachable only as a child of `/team`: everything that opened
 * it — the play chooser, a mission, the drawer, search, the home screen —
 * navigated to the online games hub carrying `state.openCreateRoom`, and the
 * hub rendered the create screen over itself. So opening a lobby meant
 * mounting the rooms page first, and for about a second that is the page you
 * saw. Making the screen paint opaque on its first frame hid the fade, but the
 * hub was still what loaded, still what fetched, and still what rendered
 * underneath.
 *
 * The coupling was the provider, not the layout: `CreateRoomPage` calls
 * `useMultiplayerV2()`, and `MultiplayerProviderV2` was mounted inside the
 * `/team` route. That is a wrapper, so it can just as well be mounted here —
 * `TeamV2`'s own export is exactly this shape — and the create screen then
 * needs nothing from the hub at all. It navigates on its own to `/game`,
 * `/king`, `/team-battle`, `/words` or `/team?join=…` once a room exists.
 *
 * The hub keeps its embedded copy for opening the screen from inside itself,
 * where the cross-fade is the transition rather than a page you did not ask
 * for.
 */
export default function CreateRoom() {
  // The home's Play rail arrives with `?mode=quick` and the like — the card
  // it showed, to be started here as if tapped. Validated against the real
  // set; anything else starts on nothing picked, as before.
  const [searchParams] = useSearchParams();
  const modeParam = searchParams.get("mode");
  const initialMode = (GAME_CHOICES as readonly string[]).includes(modeParam ?? "")
    ? (modeParam as GameChoice)
    : undefined;

  return (
    <MultiplayerProviderV2>
      <CreateRoomPage
        initialMode={initialMode}
        // This screen IS the destination here, so it never fades in over
        // whatever happened to be behind it.
        enterInstantly
        // Deliberately nothing.
        //
        // `onClose` does not mean "dismiss me". Every one of its six call
        // sites in CreateRoomPage is immediately followed by that method's own
        // `navigate(...)` — to /game, /king, /team-battle, /words or
        // /team?join= — so it means "I am about to leave", and inside the
        // rooms hub its job was to take the overlay down before the route
        // changed underneath it. Leaving the screen for real is the header's
        // back arrow, which calls `navigate("/")` itself and never comes
        // through here.
        //
        // Wiring it to `navigate(-1)` therefore fired a history pop and a push
        // in the same tick, and the pop settled last: every game mode bounced
        // straight back to where it started, which looked like the card doing
        // nothing at all. On a route of its own there is no overlay to take
        // down — the navigation that follows unmounts this page — so the
        // correct amount of work here is none.
        onClose={() => {}}
      />
    </MultiplayerProviderV2>
  );
}

import { useNavigate } from "react-router-dom";
import { MultiplayerProviderV2 } from "@/contexts/MultiplayerContextV2";
import { CreateRoomPage } from "@/components/team/CreateRoomPage";

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
  const navigate = useNavigate();

  return (
    <MultiplayerProviderV2>
      <CreateRoomPage
        // This screen IS the destination here, so it never fades in over
        // whatever happened to be behind it.
        enterInstantly
        // Back to wherever they came from — the home screen, a mission, the
        // drawer — rather than to a hub they were never on.
        onClose={() => navigate(-1)}
      />
    </MultiplayerProviderV2>
  );
}

// User ids of the seeded "content" profiles — accounts created to fill the
// explore feed rather than to be played on.
//
// These accounts never sign in, so a friend request sent to one would sit
// pending forever. FakeFriendRequestAutoAccept accepts those requests from
// the requester's own client after a delay, so they behave like real people
// who happened to be away for a while.
//
// Anything not listed here is treated as a real person and is never
// auto-accepted — a real user always decides for themselves.
export const FAKE_ACCOUNT_USER_IDS: string[] = [
  // Hand-built ids (a1b2c3d4-NNNN-4000-8000-0000000000NN), zero games and
  // zero recorded plays of any kind.
  "a1b2c3d4-1111-4000-8000-000000000001", // levan_88
  "a1b2c3d4-2222-4000-8000-000000000002", // Natato
  "a1b2c3d4-3333-4000-8000-000000000003", // Elene_E
  "a1b2c3d4-4444-4000-8000-000000000004", // Sofia
  "a1b2c3d4-5555-4000-8000-000000000005", // LASH10
  "a1b2c3d4-6666-4000-8000-000000000006", // Nona_12
  "a1b2c3d4-7777-4000-8000-000000000007", // Grigoli_a
  "a1b2c3d4-8888-4000-8000-000000000008", // Kosta

  // Hand-built ids too — rolling permutations of a1b2c3d4e5f6…, each showing
  // a different profile "games played" number but the exact same 7 recorded
  // plays, which is a seeding signature rather than real activity.
  "d3c4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f", // Saba
  "c8b9d0e1-f2a3-4b4c-5d6e-7f8a9b0c1d2e", // Tekla
  "a6f7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c", // Keti
  "b1a2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d", // Tornike
  "e4d5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a", // Salome
  "b7a8c9d0-e1f2-4a3b-4c5d-6e7f8a9b0c1d", // Irakli
  "c2b3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e", // Nino
  "f5e6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b", // Dato

  // Identified as content accounts by the product owner. Their ids look
  // ordinary, so they could not have been found by inspection alone.
  "bdc9ced2-fbd7-48c2-bced-7e984df06de1", // სოფიო
  "23c2b463-ebf0-40a2-a7f2-14c0556717fa", // Amiko
  "98a7bf77-23ce-4080-81c6-8184fd882d11", // George M.
];

// A pending request to a fake account is accepted somewhere in this window,
// never instantly — the exact moment is derived from the friendship row id,
// so it stays stable across reloads instead of re-rolling each time.
export const FAKE_ACCEPT_MIN_HOURS = 4;
export const FAKE_ACCEPT_MAX_HOURS = 48;

// Stable 0..1 value from a row id — same id always yields the same delay.
function hashToUnitInterval(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 10_000) / 10_000;
}

/** Milliseconds after the request was sent before this fake account replies. */
export function fakeAcceptDelayMs(friendshipId: string): number {
  const span = FAKE_ACCEPT_MAX_HOURS - FAKE_ACCEPT_MIN_HOURS;
  const hours = FAKE_ACCEPT_MIN_HOURS + hashToUnitInterval(friendshipId) * span;
  return hours * 60 * 60 * 1000;
}

/** True when this profile exists only to publish explore content. */
export const isFakeAccount = (userId: string | null | undefined): boolean =>
  !!userId && FAKE_ACCOUNT_USER_IDS.includes(userId);

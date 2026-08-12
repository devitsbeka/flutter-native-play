import { describe, it, expect } from "vitest";
import { compareRooms, type OrderableRoom } from "@/utils/roomOrder";

// The list used to sort by five priority classes, and a room only counted as
// "my new room" for five minutes. After that a freshly created room fell back
// into the pile behind any LIVE or unread room — it looked like the room you
// had just made had vanished. These pin the one rule that replaced them.

const at = (minutesAgo: number): string =>
  new Date(Date.now() - minutesAgo * 60_000).toISOString();

const room = (over: Partial<OrderableRoom>): OrderableRoom => ({
  created_at: at(120),
  last_activity_at: null,
  ...over,
});

const order = (rooms: OrderableRoom[]) => [...rooms].sort(compareRooms);

describe("room ordering", () => {
  it("puts a just-created room first", () => {
    const fresh = room({ created_at: at(0) });
    const old = room({ created_at: at(600) });
    expect(order([old, fresh])[0]).toBe(fresh);
  });

  it("keeps it first well past the old five-minute window", () => {
    const mine = room({ created_at: at(45) });
    const older = room({ created_at: at(300), last_activity_at: at(120) });
    expect(order([older, mine])[0]).toBe(mine);
  });

  it("counts activity as recency, so a live room rises", () => {
    const chatty = room({ created_at: at(900), last_activity_at: at(1) });
    const quiet = room({ created_at: at(30) });
    expect(order([quiet, chatty])[0]).toBe(chatty);
  });

  it("pins a live TV session above everything", () => {
    const tv = room({ created_at: at(900), hasLiveTV: true });
    const fresh = room({ created_at: at(0) });
    expect(order([fresh, tv])[0]).toBe(tv);
  });

  it("survives missing timestamps", () => {
    const nothing = room({ created_at: null, last_activity_at: null });
    const fresh = room({ created_at: at(5) });
    expect(order([nothing, fresh])[0]).toBe(fresh);
  });
});

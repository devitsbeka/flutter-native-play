import { describe, expect, it } from "vitest";
import { PostgrestClient } from "@supabase/postgrest-js";

/**
 * A Supabase query builder is a PromiseLike, not a Promise.
 *
 * It defines `then` and nothing else — no `catch`, no `finally`. So
 *
 *     supabase.rpc("f", args).catch(() => fallback)
 *
 * does not fall back on failure; it throws "catch is not a function" the
 * moment the line runs. That shipped in usePlayerProfile behind an
 * `as unknown as (...) => Promise<...>` cast, which is exactly the sort of
 * lie a cast can tell: the compiler was told it had a Promise, so the call
 * type-checked, and the profile's versus panel then rendered nothing at all
 * on a pair with 170 shared matches — a broken render, not a failed request,
 * because the throw happened before any await.
 *
 * Awaiting a thenable inside try/catch is correct and is what the code does
 * now. This pins the property itself, since nothing in the type system will:
 * the day the builder does gain a `catch`, this test is what says so.
 */

describe("supabase query builders", () => {
  // No network: a builder only issues its request when awaited.
  const client = new PostgrestClient("http://localhost/never-called");
  const builder = client.rpc("some_function", { arg: 1 });

  it("is thenable", () => {
    expect(typeof (builder as { then?: unknown }).then).toBe("function");
  });

  it("has no catch, so .catch() on one is a crash and not a fallback", () => {
    expect(typeof (builder as { catch?: unknown }).catch).not.toBe("function");
  });

  it("reports a dead request through `error`, not by rejecting", async () => {
    // Nothing is listening on this host. postgrest-js catches the fetch
    // failure itself and resolves — so awaiting is not enough on its own and
    // the caller has to read `error`. rpcRows in usePlayerProfile does both:
    // try/catch for a throw, and an explicit error check for this.
    const result = await client.rpc("some_function", { arg: 1 });
    expect(result.error, "a failed call must surface through error").not.toBeNull();
    expect(result.data).toBeNull();
  });
});

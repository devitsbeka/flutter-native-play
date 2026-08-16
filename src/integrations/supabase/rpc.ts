import { supabase } from "./client";

/**
 * Call a database function that is not in the generated `types.ts` yet.
 *
 * The generated types are refreshed out-of-band (supabase gen types), so a
 * function added in a migration is unknown to the client until that happens.
 * The usual workaround is `(supabase as any).rpc(...)`, which switches off
 * checking for the arguments AND the result.
 *
 * This keeps both: only the function-name lookup is cast away, while the
 * caller still declares what it expects back and gets it checked.
 */
export async function callRpc<TResult>(
  fn: string,
  args?: Record<string, unknown>,
): Promise<{ data: TResult | null; error: RpcError | null }> {
  const client = supabase as unknown as {
    rpc: (
      name: string,
      params?: Record<string, unknown>,
    ) => Promise<{ data: TResult | null; error: RpcError | null }>;
  };
  return client.rpc(fn, args);
}

/**
 * What PostgREST returns when a function raises.
 *
 * `hint` is carried because `message` is written in English inside the
 * migration and shown to a player reading the app in Georgian. A function
 * that raises `USING HINT = 'some_code'` gets that code through untouched,
 * which the caller can look up in the locale files — the message is then the
 * fallback for a code the build does not know rather than the only option.
 */
export interface RpcError {
  message: string;
  hint?: string | null;
  details?: string | null;
  code?: string | null;
}

/**
 * Read from a table that is not in the generated `types.ts` yet.
 *
 * Same bargain as `callRpc` above, for the same reason: a table added in a
 * migration is unknown to the client until the types are regenerated
 * out-of-band, and the usual `(supabase as any).from(...)` throws away
 * checking on the result as well as the table name.
 *
 * Here only the builder is untyped. The caller declares the row shape and the
 * returned rows are checked against it, so a column rename still surfaces at
 * the call site rather than as `undefined` at runtime.
 */
export async function selectRows<TRow>(
  table: string,
  build: (query: PostgrestLikeBuilder) => PostgrestLikeBuilder,
): Promise<{ data: TRow[] | null; error: { message: string } | null }> {
  const client = supabase as unknown as {
    from: (name: string) => PostgrestLikeBuilder;
  };
  return build(client.from(table)) as unknown as Promise<{
    data: TRow[] | null;
    error: { message: string } | null;
  }>;
}

/** The subset of the query builder these call sites use. */
interface PostgrestLikeBuilder {
  select: (columns: string) => PostgrestLikeBuilder;
  eq: (column: string, value: unknown) => PostgrestLikeBuilder;
  is: (column: string, value: unknown) => PostgrestLikeBuilder;
  order: (column: string, opts?: { ascending?: boolean }) => PostgrestLikeBuilder;
}

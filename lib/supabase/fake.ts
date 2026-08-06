/**
 * Minimal fake Supabase client for unit-testing DB-bound lib functions
 * without a live project. Chainable like the real client:
 *
 *   fake.from("accounts").select("...").eq("id", x).maybeSingle()
 *   fake.rpc("upsert_failed_payment", params) => { error: null }
 *
 * Configure via constructor options:
 *   rows: rows returned by maybeSingle() (per table)
 *   lists: rows returned by list-y selects (per table)
 *   rpcErrors: map of rpc name → error (or null)
 */

type Row = Record<string, unknown>;

export class FakeSupabase {
  rows: Record<string, Row | null>;
  lists: Record<string, Row[]>;
  rpcErrors: Record<string, Error | null>;
  rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  insertCalls: Array<{ table: string; values: Row | Row[] }> = [];
  updateCalls: Array<{ table: string; values: Row }> = [];

  constructor(opts: {
    rows?: Record<string, Row | null>;
    lists?: Record<string, Row[]>;
    rpcErrors?: Record<string, Error | null>;
  } = {}) {
    this.rows = opts.rows ?? {};
    this.lists = opts.lists ?? {};
    this.rpcErrors = opts.rpcErrors ?? {};
  }

  from(table: string) {
    // Capture the fake's state (not `this` itself) so the chain closures have
    // a stable reference without aliasing `this` (no-this-alias safe).
    const { rows, lists, insertCalls, updateCalls } = this;
    const where: Record<string, unknown> = {};

    interface Chain {
      select(): Chain;
      eq(col: string, val: unknown): Chain;
      is(col: string, val: unknown): Chain;
      maybeSingle(): Promise<{ data: Row | null }>;
      single(): Promise<{ data: Row | null; error: Error | null }>;
      limit(): Chain;
      order(): Chain;
      upsert(values: Row | Row[]): Chain;
      insert(values: Row | Row[]): Chain;
      update(values: Row): Chain;
      then<A = unknown, B = never>(
        resolve: (value: { data: Row[] | Row | null; error: Error | null }) => A,
        reject?: (reason: unknown) => B,
      ): Promise<A | B>;
    }

    const buildChain = (): Chain => ({
      select(): Chain {
        return chain;
      },
      eq(col: string, val: unknown): Chain {
        where[col] = val;
        return chain;
      },
      is(col: string, val: unknown): Chain {
        where[col] = val;
        return chain;
      },
      maybeSingle(): Promise<{ data: Row | null }> {
        const list = lists[table];
        if (list) {
          const found = list.find((r) =>
            Object.entries(where).every(([k, v]) => r[k] === v),
          );
          return Promise.resolve({ data: found ?? null });
        }
        return Promise.resolve({ data: rows[table] ?? null });
      },
      single(): Promise<{ data: Row | null; error: Error | null }> {
        return Promise.resolve({ data: rows[table] ?? null, error: null });
      },
      limit(): Chain {
        return chain;
      },
      order(): Chain {
        return chain;
      },
      // Awaiting a list-query returns the table's rows, filtered by simple
      // top-level where keys. Dotted embed keys ("customers.account_id") are
      // ignored — unit tests assert mapping, not embed filtering.
      then<A = unknown, B = never>(
        resolve: (value: { data: Row[] | Row | null; error: Error | null }) => A,
        reject?: (reason: unknown) => B,
      ): Promise<A | B> {
        const list = lists[table];
        const simpleWhere = Object.fromEntries(
          Object.entries(where).filter(([k]) => !k.includes(".")),
        );
        const data = list
          ? list.filter((r) =>
              Object.entries(simpleWhere).every(([k, v]) => r[k] === v),
            )
          : (rows[table] ?? null);
        return Promise.resolve({
          data,
          error: null as Error | null,
        }).then(resolve, reject);
      },
      upsert(values: Row | Row[]): Chain {
        insertCalls.push({ table, values });
        const chain2: Chain = { ...chain };
        Object.assign(chain2, {
          select: () => chain2,
          maybeSingle: () =>
            Promise.resolve({
              data: Array.isArray(values) ? values[0] ?? null : values,
            }),
        });
        return chain2;
      },
      insert(values: Row | Row[]): Chain {
        insertCalls.push({ table, values });
        const chain2: Chain = { ...chain };
        Object.assign(chain2, {
          select: () => chain2,
          maybeSingle: () =>
            Promise.resolve({
              data: Array.isArray(values) ? values[0] ?? null : values,
            }),
        });
        return chain2;
      },
      update(values: Row): Chain {
        updateCalls.push({ table, values });
        const chain2: Chain = { ...chain };
        Object.assign(chain2, {
          eq: () => chain2,
          is: () => chain2,
          select: () => chain2,
          maybeSingle: () => Promise.resolve({ data: values }),
          single: () => Promise.resolve({ data: values, error: null }),
        });
        return chain2;
      },
    });

    const chain = buildChain();
    return chain;
  }

  rpc(name: string, args: Record<string, unknown>) {
    this.rpcCalls.push({ name, args });
    const error = this.rpcErrors[name] ?? null;
    return Promise.resolve({ data: null, error });
  }
}

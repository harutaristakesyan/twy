import { type db, loadRefSeq } from "@twy/db";
import { sql } from "drizzle-orm";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

/**
 * Atomically allocate the next load reference number for the current year.
 *
 * The single INSERT … ON CONFLICT DO UPDATE takes a row lock on the (year)
 * primary key, so concurrent allocations serialise behind it and every load
 * gets a unique number. Format: `L-YYYY-NNNNNNNN` (8 digits, reset each year).
 *
 * Call from inside a `db.transaction(...)`. If the load insert later rolls
 * back, this allocation rolls back too — the sequence stays contiguous.
 */
export const allocateLoadReferenceNumber = async (
  executor: Executor,
  now: Date = new Date(),
): Promise<string> => {
  const year = now.getUTCFullYear();
  const [row] = await executor
    .insert(loadRefSeq)
    .values({ year, lastValue: 1 })
    .onConflictDoUpdate({
      target: loadRefSeq.year,
      set: { lastValue: sql`${loadRefSeq.lastValue} + 1` },
    })
    .returning({ lastValue: loadRefSeq.lastValue });

  if (!row) {
    throw new Error("Failed to allocate load reference number");
  }

  return `L-${year}-${String(row.lastValue).padStart(8, "0")}`;
};

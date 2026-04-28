// run-migrations.ts

import path from "node:path";
import { getDb } from "@libs/db";
import { runMigrations } from "@libs/db/migration";

const stdout = (line: string) => process.stdout.write(`${line}\n`);

(async () => {
  let db: Awaited<ReturnType<typeof getDb>> | undefined;
  try {
    stdout("🔌 Connecting to DB...");
    db = await getDb();
    const sqlDir = path.join(__dirname, "sql");

    await runMigrations(db, sqlDir);
    stdout("✅ All migrations complete!");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exitCode = 1;
  } finally {
    try {
      await db?.destroy?.();
    } catch (closeErr) {
      console.error("⚠️ Failed to close DB connection cleanly:", closeErr);
    }
    process.exit(process.exitCode ?? 0);
  }
})();

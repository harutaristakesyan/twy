import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "../client.js";
import { runMigrations } from "../migration.js";

const stdout = (line: string) => process.stdout.write(`${line}\n`);

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(here, "../../drizzle");

const isResumingError = (err: unknown): boolean =>
  typeof err === "object" &&
  err !== null &&
  (err as Record<string, unknown>).name === "DatabaseResumingException";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      stdout(`Applying Drizzle migrations from ${migrationsFolder}...`);
      await runMigrations(db, migrationsFolder);
      stdout("All migrations complete.");
      process.exit(0);
    } catch (err) {
      if (isResumingError(err) && attempt < maxAttempts) {
        const wait = attempt * 10_000;
        stdout(
          `Aurora is resuming from auto-pause. Retrying in ${wait / 1000}s (attempt ${attempt}/${maxAttempts})...`,
        );
        await sleep(wait);
        continue;
      }
      console.error("Migration failed:", err);
      process.exit(1);
    }
  }
})();

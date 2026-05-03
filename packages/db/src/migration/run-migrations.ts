import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "../client.js";
import { runMigrations } from "../migration.js";

const stdout = (line: string) => process.stdout.write(`${line}\n`);

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(here, "../../drizzle");

const isResumingError = (err: unknown): boolean => {
  if (typeof err !== "object" || err === null) return false;
  const e = err as Record<string, unknown>;
  if (e.name === "DatabaseResumingException") return true;
  if (typeof e.message === "string" && e.message.includes("resuming after being auto-paused"))
    return true;
  return isResumingError(e.cause);
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  stdout("Waiting 7s for Aurora to resume from auto-pause...");
  await sleep(7_000);

  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      stdout(`Applying Drizzle migrations from ${migrationsFolder}...`);
      await runMigrations(db, migrationsFolder);
      stdout("All migrations complete.");
      process.exit(0);
    } catch (err) {
      if (isResumingError(err) && attempt < maxAttempts) {
        const wait = attempt * 7_000;
        stdout(
          `Aurora is still resuming. Retrying in ${wait / 1000}s (attempt ${attempt}/${maxAttempts})...`,
        );
        await sleep(wait);
        continue;
      }
      console.error("Migration failed:", err);
      process.exit(1);
    }
  }
})();

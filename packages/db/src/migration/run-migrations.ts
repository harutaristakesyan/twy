import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "../client.js";
import { runMigrations } from "../migration.js";

const stdout = (line: string) => process.stdout.write(`${line}\n`);

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(here, "../../drizzle");

(async () => {
  try {
    stdout(`Applying Drizzle migrations from ${migrationsFolder}...`);
    await runMigrations(db, migrationsFolder);
    stdout("All migrations complete.");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exitCode = 1;
  } finally {
    process.exit(process.exitCode ?? 0);
  }
})();

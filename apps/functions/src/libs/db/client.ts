import { DsqlSigner } from "@aws-sdk/dsql-signer";
import { CamelCasePlugin, Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import { Resource } from "sst";
import type { Database } from "./index.js";

const dbName = "postgres";
const dbUser = "admin";

function createTTLCache<T extends { destroy?: () => Promise<void> }>(
  ttlMs: number,
  factory: () => Promise<T>,
) {
  let cachedValue: T | undefined;
  let lastFetched = 0;
  let timeout: NodeJS.Timeout | undefined;
  let building: Promise<T> | null = null;

  return async (): Promise<T> => {
    const now = Date.now();
    const expired = !cachedValue || now - lastFetched > ttlMs;

    if (!expired && cachedValue) return cachedValue;

    if (building) return building;

    building = (async () => {
      if (cachedValue?.destroy) {
        try {
          await cachedValue.destroy();
        } catch (err) {
          console.error("[TTLCache] Failed to destroy previous value:", err);
        }
      }

      const fresh = await factory();
      cachedValue = fresh;
      lastFetched = Date.now();

      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(async () => {
        if (cachedValue?.destroy) {
          try {
            await cachedValue.destroy();
          } catch (err) {
            console.error("[TTLCache] Scheduled destroy failed:", err);
          }
        }
        cachedValue = undefined;
      }, ttlMs);

      return fresh;
    })();

    try {
      return await building;
    } finally {
      building = null;
    }
  };
}

export const getDb = createTTLCache(10 * 60 * 1000, async () => {
  const hostname = Resource.Cluster.host;
  const region = Resource.Cluster.region;

  const signer = new DsqlSigner({ hostname, region, expiresIn: 900 });
  const token = await signer.getDbConnectAdminAuthToken();

  const pool = new Pool({
    host: hostname,
    user: dbUser,
    database: dbName,
    port: 5432,
    ssl: true,
    password: token,
  });

  return new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  }).withPlugin(new CamelCasePlugin());
});

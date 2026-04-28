import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { DsqlSigner } from "@aws-sdk/dsql-signer";
import { requireEnv } from "@twy/lambda-shared";
import { CamelCasePlugin, Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import type { Database } from "./index.js";

const region = requireEnv("AWS_REGION");
const dbName = "postgres";
const dbUser = "admin";

const ssmClient = new SSMClient({ region });

async function getClusterId(): Promise<string> {
  const command = new GetParameterCommand({
    Name: "/dsql/cluster-id",
    WithDecryption: true,
  });
  const response = await ssmClient.send(command);
  if (!response.Parameter?.Value) {
    throw new Error("Failed to retrieve cluster ID from SSM");
  }
  return response.Parameter.Value;
}

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

    // If another caller is already (re)building, await it.
    if (building) return building;

    building = (async () => {
      // destroy previous instance (best-effort)
      if (cachedValue?.destroy) {
        try {
          await cachedValue.destroy();
        } catch (err) {
          console.error("[TTLCache] Failed to destroy previous value:", err);
        }
      }

      // build new value
      const fresh = await factory();
      cachedValue = fresh;
      lastFetched = Date.now();

      // schedule proactive destroy after TTL
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(async () => {
        if (cachedValue?.destroy) {
          try {
            await cachedValue.destroy();
          } catch (err) {
            console.error("[TTLCache] Scheduled destroy failed:", err);
          }
        }
        cachedValue = undefined; // <- important: invalidate cache
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
  const clusterId = await getClusterId();
  const hostname = `${clusterId}.dsql.${region}.on.aws`;
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

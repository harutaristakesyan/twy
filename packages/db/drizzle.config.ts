/// <reference path="../../types/sst-resources.d.ts" />
import { defineConfig } from "drizzle-kit";
import { Resource } from "sst";

/**
 * Drizzle Kit config — drives `drizzle-kit generate` (schema diff → SQL files
 * under ./drizzle) and `drizzle-kit studio`.
 *
 * Reads cluster credentials from `Resource.Cluster.*`, so run inside
 * `sst shell --stage <stage>`:
 *
 *   pnpm sst shell --stage dev -- pnpm --filter @twy/db db:generate
 *
 * (For schema-only diffs `generate` doesn't actually need a connection; we
 * still wire one so `studio` works with the same config.)
 */
export default defineConfig({
  dialect: "postgresql",
  driver: "aws-data-api",
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  casing: "snake_case",
  dbCredentials: {
    database: Resource.Cluster.database,
    secretArn: Resource.Cluster.secretArn,
    resourceArn: Resource.Cluster.clusterArn,
  },
});

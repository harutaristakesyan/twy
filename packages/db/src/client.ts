import { RDSDataClient } from "@aws-sdk/client-rds-data";
import { drizzle } from "drizzle-orm/aws-data-api/pg";
import { Resource } from "sst";
import * as schema from "./schema/index.js";

const rdsClient = new RDSDataClient({});

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

// Lazy singleton — Resource.Cluster is only read on the first DB call, not at
// module load. This lets handlers that import @twy/db types without linking
// the cluster (e.g. file-only handlers) load without crashing.
let _db: DrizzleDb | undefined;

export const db: DrizzleDb = new Proxy({} as DrizzleDb, {
  get(_, prop) {
    if (!_db) {
      _db = drizzle(rdsClient, {
        database: Resource.Cluster.database,
        secretArn: Resource.Cluster.secretArn,
        resourceArn: Resource.Cluster.clusterArn,
        schema,
        casing: "snake_case",
      });
    }
    return (_db as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export type DB = typeof db;

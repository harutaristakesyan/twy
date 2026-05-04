import { RDSDataClient } from "@aws-sdk/client-rds-data";
import { drizzle } from "drizzle-orm/aws-data-api/pg";
import { Resource } from "sst";
import * as schema from "./schema/index.js";

const createDb = () => {
  const client = new RDSDataClient({});
  return drizzle(client, {
    database: Resource.Cluster.database,
    secretArn: Resource.Cluster.secretArn,
    resourceArn: Resource.Cluster.clusterArn,
    schema,
    casing: "snake_case",
  });
};

type DbInstance = ReturnType<typeof createDb>;

let _db: DbInstance | undefined;

// Lazy proxy: defers RDSDataClient creation and Resource.Cluster access until the
// first actual DB call. Allows Lambda bundles that import @twy/db transitively
// (e.g. file handlers via @twy/core) to load without "cluster" in their linkKeys.
export const db: DbInstance = new Proxy({} as DbInstance, {
  get(_target, prop) {
    if (_db === undefined) {
      _db = createDb();
    }
    const value = Reflect.get(_db, prop, _db);
    return typeof value === "function" ? value.bind(_db) : value;
  },
});

export type DB = DbInstance;

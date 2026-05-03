import { RDSDataClient } from "@aws-sdk/client-rds-data";
import { drizzle } from "drizzle-orm/aws-data-api/pg";
import { Resource } from "sst";
import * as schema from "./schema/index.js";

const client = new RDSDataClient({});

export const db = drizzle(client, {
  database: Resource.Cluster.database,
  secretArn: Resource.Cluster.secretArn,
  resourceArn: Resource.Cluster.clusterArn,
  schema,
  casing: "snake_case",
});

export type DB = typeof db;

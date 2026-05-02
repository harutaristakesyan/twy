/// <reference path="../../types/sst-resources.d.ts" />
import { defineConfig } from "drizzle-kit";

const sstCluster = process.env.SST_RESOURCE_Cluster
  ? (JSON.parse(process.env.SST_RESOURCE_Cluster) as {
      database: string;
      secretArn: string;
      clusterArn: string;
    })
  : null;

export default defineConfig({
  dialect: "postgresql",
  driver: "aws-data-api",
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  casing: "snake_case",
  dbCredentials: {
    database: sstCluster?.database ?? "placeholder",
    secretArn:
      sstCluster?.secretArn ?? "arn:aws:secretsmanager:us-east-1:000000000000:secret:placeholder",
    resourceArn: sstCluster?.clusterArn ?? "arn:aws:rds:us-east-1:000000000000:cluster:placeholder",
  },
});

/// <reference path="../.sst/platform/config.d.ts" />

/**
 * Aurora Serverless v2 (Postgres) cluster, accessed via the RDS Data API.
 *
 * Why Data API and not a TCP connection?
 *   - Lambdas don't need to live inside the VPC, so we keep cold-start latency
 *     low and skip a NAT Gateway entirely.
 *   - SST's `link[]` injects `Resource.Cluster.{clusterArn,secretArn,database}`,
 *     and Drizzle's `aws-data-api/pg` driver consumes them directly.
 *
 * Per-stage scaling: prod stays warm at 0.5 ACU; every other stage (dev plus
 * personal stages) auto-pauses to 0 ACU after ~10 min idle.
 *
 * The cluster itself still requires a VPC — we provision a tiny SST-managed
 * VPC with no NAT (Data API talks to the cluster over the AWS network).
 */
export function createDatabase() {
  const isProd = $app.stage === "prod";

  const vpc = new sst.aws.Vpc("ClusterVpc");

  const cluster = new sst.aws.Aurora("Cluster", {
    engine: "postgres",
    dataApi: true,
    vpc,
    scaling: {
      min: isProd ? "0.5 ACU" : "0 ACU",
      max: "4 ACU",
    },
  });

  return { cluster };
}

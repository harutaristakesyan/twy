/// <reference path="../.sst/platform/config.d.ts" />

/**
 * Aurora DSQL cluster — replacement for apps/infra/bin/stacks/db-stack.ts.
 *
 * No deletion protection on dev (matches existing CfnCluster removalPolicy);
 * prod cluster is `retained` via the app-level removal policy in sst.config.ts.
 */
export function createDatabase() {
  const cluster = new sst.aws.Dsql("Cluster");
  return { cluster };
}

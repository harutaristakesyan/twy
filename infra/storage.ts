/// <reference path="../.sst/platform/config.d.ts" />

import type { StageConfig } from "./domain";

/**
 * Files bucket — replacement for the `${idPrefix}-files-bucket` previously
 * created in apps/infra/bin/stacks/domain-stack.ts.
 *
 * CORS allows the primary domain + every alias + localhost dev. Object access
 * is brokered exclusively through the file/upload, file/download, file/delete
 * Lambdas (which receive `link: [filesBucket]` in api.ts).
 */
export function createStorage(cfg: StageConfig) {
  const allowedOrigins = [
    `https://${cfg.primaryDomain}`,
    ...cfg.aliases.map((d) => `https://${d}`),
    "http://localhost:3000",
  ];

  const filesBucket = new sst.aws.Bucket("Files", {
    cors: {
      allowMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
      allowOrigins: allowedOrigins,
      allowHeaders: ["*"],
      exposeHeaders: ["ETag"],
      maxAge: "1 hour",
    },
  });

  return { filesBucket };
}

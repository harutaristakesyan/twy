/// <reference path="./.sst/platform/config.d.ts" />

/**
 * SST v4 (Ion) — single source of infrastructure truth for the twy monorepo.
 *
 * Stages:
 *   - dev  → DEV_ACCOUNT_ID, dev.twy.am + dev.twy.be
 *   - prod → PROD_ACCOUNT_ID, twy.am + twy.be (+ www variants)
 *
 * Run modules under ./infra/ each owning one slice of the stack.
 */
export default $config({
  app(input) {
    const stage = input?.stage ?? "dev";
    const isProd = stage === "prod";
    return {
      name: "twy",
      removal: isProd ? "retain" : "remove",
      protect: isProd,
      home: "aws",
      providers: {
        aws: {
          region: "us-east-1",
          profile: process.env.AWS_PROFILE ?? (isProd ? "twy-prod" : "twy-dev"),
        },
      },
    };
  },
  async run() {
    const { stageConfig } = await import("./infra/domain");
    const { createDatabase } = await import("./infra/database");
    const { createStorage } = await import("./infra/storage");
    const { createEmail } = await import("./infra/email");
    const { createAuth } = await import("./infra/auth");
    const { createApi } = await import("./infra/api");
    const { createWeb } = await import("./infra/web");

    const cfg = stageConfig();

    const db = createDatabase();
    const storage = createStorage(cfg);
    const email = createEmail(cfg);
    const auth = createAuth({ db });
    const api = createApi({
      cfg,
      auth,
      db,
      filesBucket: storage.filesBucket,
    });
    const web = createWeb({ cfg, api });

    return {
      stage: $app.stage,
      primaryDomain: cfg.primaryDomain,
      aliases: cfg.aliases,
      siteUrl: web.url,
      apiUrl: api.api.url,
      clusterEndpoint: db.cluster.endpoint,
      userPoolId: auth.userPool.id,
      userPoolClientId: auth.userPoolClient.id,
      filesBucket: storage.filesBucket.name,
      emailIdentities: email.identities.map((i) => i.sender),
    };
  },
});

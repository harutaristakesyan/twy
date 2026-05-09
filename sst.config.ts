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
    const { createAuthContextTable } = await import("./infra/authContextTable");
    const { createCron } = await import("./infra/cron");

    const cfg = stageConfig();

    const db = createDatabase();
    const storage = createStorage(cfg);
    const email = createEmail(cfg);
    const authContext = createAuthContextTable();
    const auth = createAuth({
      db,
      filesBucket: storage.filesBucket,
      authContextTable: authContext.table,
    });
    const api = createApi({
      cfg,
      auth,
      db,
      filesBucket: storage.filesBucket,
      authContextTable: authContext.table,
    });
    const web = createWeb({ cfg, api });
    createCron();

    return {
      stage: $app.stage,
      marketingDomain: cfg.marketingDomain,
      appDomain: cfg.appDomain,
      marketingUrl: web.marketingUrl,
      appUrl: web.appUrl,
      apiUrl: api.api.url,
      clusterHost: db.cluster.host,
      userPoolId: auth.userPool.id,
      userPoolClientId: auth.userPoolClient.id,
      filesBucket: storage.filesBucket.name,
      emailIdentities: email.identities.map((i) => i.sender),
    };
  },
});

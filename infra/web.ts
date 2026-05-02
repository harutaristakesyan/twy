/// <reference path="../.sst/platform/config.d.ts" />

import type { StageConfig } from "./domain";

interface CreateWebArgs {
  cfg: StageConfig;
  api: { api: sst.aws.ApiGatewayV2 };
}

/**
 * Two CloudFront Routers:
 *
 *   Marketing Router — twy.am / twy.be (+ www) → Astro static site (apps/web)
 *   App Router       — app.twy.am / app.twy.be → React SPA (apps/dashboard)
 *                      + /api/* proxy → ApiGatewayV2
 */
export function createWeb(args: CreateWebArgs) {
  const { cfg, api } = args;

  const marketingRouter = new sst.aws.Router("Marketing", {
    domain: {
      name: cfg.marketingDomain,
      aliases: cfg.marketingAliases,
      dns: sst.aws.dns(),
    },
  });

  const marketingSite = new sst.aws.StaticSite("MarketingSite", {
    path: "apps/web",
    build: {
      command: "pnpm build",
      output: "dist",
    },
    errorPage: "404.html",
    environment: {
      PUBLIC_APP_URL: `https://${cfg.appDomain}`,
      PUBLIC_STAGE: $app.stage,
    },
    router: { instance: marketingRouter },
  });

  const appRouter = new sst.aws.Router("AppRouter", {
    domain: {
      name: cfg.appDomain,
      aliases: cfg.appAliases,
      dns: sst.aws.dns(),
    },
  });

  appRouter.route("/api", api.api.url);

  const dashboardSite = new sst.aws.StaticSite("Dashboard", {
    path: "apps/dashboard",
    build: {
      command: "pnpm build",
      output: "out",
    },
    router: { instance: appRouter },
  });

  return {
    marketingRouter,
    appRouter,
    marketingSite,
    dashboardSite,
    marketingUrl: marketingRouter.url,
    appUrl: appRouter.url,
  };
}

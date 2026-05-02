/// <reference path="../.sst/platform/config.d.ts" />

import type { StageConfig } from "./domain";

interface CreateWebArgs {
  cfg: StageConfig;
  api: { api: sst.aws.ApiGatewayV2 };
}

/**
 * Multi-domain CloudFront Router fronting the React/Vite SPA + same-origin
 * /api proxy to the HTTP API.
 *
 * Replaces:
 *   - apps/infra/bin/stacks/cloud-front-stack.ts (CloudFront distribution +
 *     SPA bucket + /api/* behavior + CloudFront Function rewrite + viewer
 *     cert from SSM + multiple ARecords).
 *   - apps/dashboard/bin/stack.ts (BucketDeployment of `out/`).
 *
 * The Router owns the cert (multi-SAN across primary + aliases, validated
 * via DNS in each zone) and the CloudFront distribution. StaticSite uploads
 * the Vite build to the Router-managed S3 origin and triggers an
 * invalidation. `router.route("/api", api.url)` proxies /api/* to the API
 * Gateway origin so the UI can call relative `/api/...` URLs (no CORS
 * preflight in production).
 *
 * Personal/ephemeral stages (anything other than `dev` or `prod`) skip the
 * custom-domain wiring and use the Router's default CloudFront name.
 */
export function createWeb(args: CreateWebArgs) {
  const { cfg, api } = args;

  const router = new sst.aws.Router(
    "Web",
    cfg.hasCustomDomain && cfg.primaryDomain
      ? {
          domain: {
            name: cfg.primaryDomain,
            aliases: cfg.aliases,
            dns: sst.aws.dns(),
          },
        }
      : {},
  );

  router.route("/api", api.api.url);

  const site = new sst.aws.StaticSite("Dashboard", {
    path: "apps/dashboard",
    build: {
      command: "pnpm build",
      output: "out",
    },
    router: { instance: router },
  });

  return { router, site, url: router.url };
}

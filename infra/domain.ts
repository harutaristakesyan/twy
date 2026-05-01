/// <reference path="../.sst/platform/config.d.ts" />

/**
 * Per-stage domain configuration.
 *
 * Replaces apps/infra/bin/environments.ts. The `idPrefix`-derived physical
 * names from the CDK era are gone — SST generates unique resource names from
 * the `$app.name + $app.stage` pair, so the only thing left here is the
 * domain shape.
 *
 * `dev` and `prod` are the only stages that get a custom domain — every
 * other stage is treated as personal/ephemeral and uses no custom domain
 * (the Router falls back to its CloudFront default name). This keeps
 * `sst dev --stage <username>` cheap and conflict-free.
 */
export interface StageConfig {
  stage: string;
  /** When false, web/email components must skip custom-domain wiring. */
  hasCustomDomain: boolean;
  primaryDomain?: string;
  aliases: string[];
  /** Senders used by sst.aws.Email (one identity per apex domain). Empty for ephemeral stages. */
  emailDomains: string[];
}

const dev: StageConfig = {
  stage: "dev",
  hasCustomDomain: true,
  primaryDomain: "dev.twy.am",
  aliases: ["dev.twy.be"],
  emailDomains: ["dev.twy.am", "dev.twy.be"],
};

const prod: StageConfig = {
  stage: "prod",
  hasCustomDomain: true,
  primaryDomain: "twy.am",
  aliases: ["twy.be", "www.twy.am", "www.twy.be"],
  emailDomains: ["twy.am", "twy.be"],
};

export function stageConfig(): StageConfig {
  if ($app.stage === "prod") return prod;
  if ($app.stage === "dev") return dev;
  return {
    stage: $app.stage,
    hasCustomDomain: false,
    aliases: [],
    emailDomains: [],
  };
}

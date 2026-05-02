/// <reference path="../.sst/platform/config.d.ts" />

export interface StageConfig {
  stage: string;
  /** Marketing apex host (Astro static site) — primary domain for Marketing Router. */
  marketingDomain: string;
  /** Marketing apex aliases (twy.be, www variants). */
  marketingAliases: string[];
  /** Dashboard host — primary domain for App Router. */
  appDomain: string;
  /** Dashboard aliases (app.twy.be). */
  appAliases: string[];
  /** Senders used by sst.aws.Email (one identity per apex domain). */
  emailDomains: string[];
}

const dev: StageConfig = {
  stage: "dev",
  marketingDomain: "dev.twy.am",
  marketingAliases: ["dev.twy.be"],
  appDomain: "app.dev.twy.am",
  appAliases: ["app.dev.twy.be"],
  emailDomains: ["dev.twy.am", "dev.twy.be"],
};

const prod: StageConfig = {
  stage: "prod",
  marketingDomain: "twy.am",
  marketingAliases: ["twy.be", "www.twy.am", "www.twy.be"],
  appDomain: "app.twy.am",
  appAliases: ["app.twy.be"],
  emailDomains: ["twy.am", "twy.be"],
};

export function stageConfig(): StageConfig {
  if ($app.stage === "prod") return prod;
  if ($app.stage === "dev") return dev;
  throw new Error(`Unknown stage: ${$app.stage}. Only "dev" and "prod" are supported.`);
}

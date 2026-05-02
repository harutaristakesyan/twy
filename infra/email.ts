/// <reference path="../.sst/platform/config.d.ts" />

import type { StageConfig } from "./domain";

/** Apex used by SPF's `include:` directive (matches every region). */
const SES_SPF_INCLUDE = "v=spf1 include:amazonses.com ~all";

/** Google Search Console verification — primary domain only. Mirrors apps/infra/bin/stacks/domain-stack.ts. */
const GOOGLE_SITE_VERIFICATION =
  "google-site-verification=FIK-nfl2SL1L7SB2ajoqSnpERPmJpWy3mDQpKPMWUqg";

/**
 * SES email identities (DKIM via `sst.aws.Email`) plus the apex SPF + DMARC
 * TXT records and the primary-only Google site verification — replacement
 * for the per-domain ses.EmailIdentity + route53.TxtRecord block previously
 * in apps/infra/bin/stacks/domain-stack.ts (lines 64-94).
 *
 * `sst.aws.Email` only creates the SES domain identity + DKIM CNAMEs. SPF
 * (sender authorization), DMARC (reporting policy), and the Google search
 * verification TXT have to be added explicitly via `aws.route53.Record`.
 */
export function createEmail(cfg: StageConfig) {
  const identities = cfg.emailDomains.map(
    (domain) =>
      new sst.aws.Email(`Email-${domain.replace(/\./g, "-")}`, {
        sender: domain,
        dns: sst.aws.dns(),
      }),
  );

  if (!cfg.hasCustomDomain) {
    return { identities, txtRecords: [] };
  }

  const txtRecords = cfg.emailDomains.flatMap((domain) => {
    const isPrimary = domain === cfg.primaryDomain;
    const zone = aws.route53.getZoneOutput({ name: domain, privateZone: false });
    const safeId = domain.replace(/\./g, "-");

    const spfValues = isPrimary ? [SES_SPF_INCLUDE, GOOGLE_SITE_VERIFICATION] : [SES_SPF_INCLUDE];

    const spf = new aws.route53.Record(`SpfRecord-${safeId}`, {
      zoneId: zone.zoneId,
      name: domain,
      type: "TXT",
      ttl: 60 * 60 * 24 * 2, // 2 days, matches the CDK Duration.days(2).
      records: spfValues,
    });

    const dmarc = new aws.route53.Record(`DmarcRecord-${safeId}`, {
      zoneId: zone.zoneId,
      name: `_dmarc.${domain}`,
      type: "TXT",
      ttl: 60 * 60 * 24 * 2,
      records: [`v=DMARC1; p=none; rua=mailto:dmarc-reports@${domain}`],
    });

    return [spf, dmarc];
  });

  return { identities, txtRecords };
}

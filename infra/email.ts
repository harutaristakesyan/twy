/// <reference path="../.sst/platform/config.d.ts" />

import type { StageConfig } from "./domain";

const SES_SPF_INCLUDE = "v=spf1 include:amazonses.com ~all";
const GOOGLE_SITE_VERIFICATION =
  "google-site-verification=FIK-nfl2SL1L7SB2ajoqSnpERPmJpWy3mDQpKPMWUqg";

export function createEmail(cfg: StageConfig) {
  const identities = cfg.emailDomains.map((domain) => {
    const isPrimary = domain === cfg.marketingDomain;
    const safeId = domain.replace(/\./g, "-");
    const zone = aws.route53.getZoneOutput({ name: domain, privateZone: false });

    const identity = new sst.aws.Email(`Email-${safeId}`, {
      sender: domain,
      dns: sst.aws.dns(),
      dmarc: `v=DMARC1; p=none; rua=mailto:dmarc-reports@${domain}`,
    });

    new aws.route53.Record(`SpfRecord-${safeId}`, {
      zoneId: zone.zoneId,
      name: domain,
      type: "TXT",
      ttl: 60 * 60 * 24 * 2,
      records: isPrimary ? [SES_SPF_INCLUDE, GOOGLE_SITE_VERIFICATION] : [SES_SPF_INCLUDE],
    });

    return identity;
  });

  return { identities };
}

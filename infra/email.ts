/// <reference path="../.sst/platform/config.d.ts" />

import type { StageConfig } from "./domain";

/**
 * SES email identities — replacement for the per-domain `ses.EmailIdentity`
 * + manual SPF/DMARC TXT records previously created in
 * apps/infra/bin/stacks/domain-stack.ts.
 *
 * `sst.aws.Email` with `dns` set creates the verified identity, DKIM CNAMEs,
 * SPF, and a `p=none` DMARC record in the matching Route53 hosted zone.
 */
export function createEmail(cfg: StageConfig) {
  const identities = cfg.emailDomains.map(
    (domain) =>
      new sst.aws.Email(`Email-${domain.replace(/\./g, "-")}`, {
        sender: domain,
        dns: sst.aws.dns(),
      }),
  );
  return { identities };
}

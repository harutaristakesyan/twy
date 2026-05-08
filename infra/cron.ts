/// <reference path="../.sst/platform/config.d.ts" />

interface CreateCronArgs {
  db: { cluster: sst.aws.Aurora };
  emailIdentity: sst.aws.Email;
}

export function createCron({ db, emailIdentity }: CreateCronArgs) {
  const billingReminders = new sst.aws.Cron("BillingReminders", {
    schedule: "cron(0 9 * * ? *)",
    job: {
      handler: "packages/functions/src/events/billingReminders.handler",
      link: [db.cluster, emailIdentity],
      environment: { BILLING_FROM_DOMAIN: $interpolate`${emailIdentity.sender}` },
      architecture: "arm64",
      runtime: "nodejs24.x",
      memory: "256 MB",
      timeout: "5 minutes",
      logging: { retention: "3 days" },
    },
  });

  return { billingReminders };
}

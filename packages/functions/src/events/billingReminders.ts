import {
  getOverdueInvoices,
  getUpcomingCarrierDueInvoices,
  markInvoiceOverdue,
  markReminderSent,
} from "@twy/core";
import { sendEmail } from "@twy/email";

// Internal accounting team — all billing reminders go here, not to external carriers/brokers.
// BILLING_FROM_DOMAIN is injected by infra/cron.ts from the linked sst.aws.Email identity.
const FROM_DOMAIN = process.env.BILLING_FROM_DOMAIN ?? "twy.am";
const ACCOUNTING_EMAIL = `accounting@${FROM_DOMAIN}`;

const formatAmount = (amount: string | number): string =>
  Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const handler = async (): Promise<void> => {
  const now = new Date();

  const [overdueBroker, upcomingCarrier] = await Promise.all([
    getOverdueInvoices(now),
    getUpcomingCarrierDueInvoices(2),
  ]);

  for (const inv of upcomingCarrier) {
    if (inv.lastReminderSentAt !== null) {
      const hoursSince = (now.getTime() - new Date(inv.lastReminderSentAt).getTime()) / 3_600_000;
      if (hoursSince < 23) continue;
    }

    try {
      await sendEmail({
        from: ACCOUNTING_EMAIL,
        to: ACCOUNTING_EMAIL,
        subject: `Carrier payment due soon — Invoice ${inv.id}`,
        template: "carrier_reminder",
        params: {
          invoiceId: inv.id,
          loadId: inv.loadId,
          dueAt: new Date(inv.dueAt).toDateString(),
          amount: formatAmount(inv.amount),
          currency: inv.currency,
        },
      });
      await markReminderSent(inv.id);
    } catch (err) {
      process.stdout.write(
        `Failed to send carrier reminder for invoice ${inv.id}: ${String(err)}\n`,
      );
    }
  }

  for (const inv of overdueBroker) {
    if (inv.lastReminderSentAt !== null) {
      const hoursSince = (now.getTime() - new Date(inv.lastReminderSentAt).getTime()) / 3_600_000;
      if (hoursSince < 23) continue;
    }

    try {
      await sendEmail({
        from: ACCOUNTING_EMAIL,
        to: ACCOUNTING_EMAIL,
        subject: `Broker invoice overdue — Invoice ${inv.id}`,
        template: "broker_overdue",
        params: {
          invoiceId: inv.id,
          loadId: inv.loadId,
          dueAt: new Date(inv.dueAt).toDateString(),
          amount: formatAmount(inv.amount),
          currency: inv.currency,
        },
      });
      await markInvoiceOverdue(inv.id);
      await markReminderSent(inv.id);
    } catch (err) {
      process.stdout.write(
        `Failed to send broker reminder for invoice ${inv.id}: ${String(err)}\n`,
      );
    }
  }

  process.stdout.write(
    `Billing reminders: ${upcomingCarrier.length} carrier upcoming, ${overdueBroker.length} broker overdue\n`,
  );
};

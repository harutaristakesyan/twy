import { randomUUID } from "node:crypto";
import { type db, invoice, load, loadAuditLog } from "@twy/db";
import { eq } from "drizzle-orm";
import { getInvoicePaidAmount } from "../invoice/repository.js";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const getLoadInvoices = async (tx: Tx, loadId: string) => {
  const rows = await tx.select().from(invoice).where(eq(invoice.loadId, loadId));

  const carrier = rows.find((r) => r.type === "carrier") ?? null;
  const broker = rows.find((r) => r.type === "broker") ?? null;

  return { carrier, broker };
};

export const tryAutoApprove = async (tx: Tx, loadId: string): Promise<boolean> => {
  const [loadRow] = await tx
    .select({
      id: load.id,
      status: load.status,
      carrierRate: load.carrierRate,
      customerRate: load.customerRate,
    })
    .from(load)
    .where(eq(load.id, loadId));

  if (!loadRow || loadRow.status !== "Pending") return false;

  const { carrier: carrierInv, broker: brokerInv } = await getLoadInvoices(tx, loadId);

  if (!carrierInv || !brokerInv) return false;
  if (carrierInv.status === "void" || brokerInv.status === "void") return false;

  const now = new Date();
  await tx
    .update(load)
    .set({ status: "Approved", financialsLockedAt: now, updatedAt: now })
    .where(eq(load.id, loadId));

  await tx.insert(loadAuditLog).values({ id: randomUUID(), loadId, event: "auto_approve" });

  return true;
};

export const tryAutoMarkPaid = async (tx: Tx, loadId: string): Promise<boolean> => {
  const [loadRow] = await tx
    .select({ id: load.id, status: load.status })
    .from(load)
    .where(eq(load.id, loadId));

  if (!loadRow || loadRow.status !== "Approved") return false;

  const { carrier: carrierInv, broker: brokerInv } = await getLoadInvoices(tx, loadId);

  if (!carrierInv || !brokerInv) return false;

  const carrierPaid = await getInvoicePaidAmount(tx, carrierInv.id);
  const brokerPaid = await getInvoicePaidAmount(tx, brokerInv.id);

  const carrierFull = carrierPaid >= Number(carrierInv.amount);
  const brokerFull = brokerPaid >= Number(brokerInv.amount);

  if (!carrierFull || !brokerFull) return false;

  await tx
    .update(load)
    .set({ status: "ApprovedPaid", updatedAt: new Date() })
    .where(eq(load.id, loadId));

  await tx.insert(loadAuditLog).values({ id: randomUUID(), loadId, event: "auto_paid" });

  return true;
};

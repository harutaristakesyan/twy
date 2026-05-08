import { randomUUID } from "node:crypto";
import {
  db,
  type InvoiceRow,
  type InvoiceStatus,
  type InvoiceType,
  invoice,
  payment,
} from "@twy/db";
import { and, desc, eq, inArray, lt, sum } from "drizzle-orm";
import createError from "http-errors";

const numericToNumber = (value: string | null): number => (value === null ? 0 : Number(value));

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

export interface CreateInvoiceInput {
  loadId: string;
  type: InvoiceType;
  amount: number;
  paymentTermDays: number;
  fileId?: string | null;
  createdBy: string;
}

export interface InvoiceRecord {
  id: string;
  loadId: string;
  type: InvoiceType;
  amount: number;
  currency: string;
  issuedAt: string;
  dueAt: string;
  paymentTermDays: number;
  status: InvoiceStatus;
  fileId: string | null;
  lastReminderSentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const mapInvoiceRow = (row: InvoiceRow): InvoiceRecord => ({
  id: row.id,
  loadId: row.loadId,
  type: row.type,
  amount: Number(row.amount),
  currency: row.currency,
  issuedAt: row.issuedAt.toISOString(),
  dueAt: row.dueAt.toISOString(),
  paymentTermDays: row.paymentTermDays,
  status: row.status,
  fileId: row.fileId ?? null,
  lastReminderSentAt: row.lastReminderSentAt ? row.lastReminderSentAt.toISOString() : null,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const computeDueAt = (issuedAt: Date, paymentTermDays: number): Date => {
  const dueAt = new Date(issuedAt);
  dueAt.setDate(dueAt.getDate() + paymentTermDays);
  return dueAt;
};

export const createInvoice = async (
  executor: Executor,
  input: CreateInvoiceInput,
): Promise<InvoiceRecord> => {
  const existing = await executor
    .select({ id: invoice.id })
    .from(invoice)
    .where(and(eq(invoice.loadId, input.loadId), eq(invoice.type, input.type)));

  if (existing.length > 0) {
    throw new createError.Conflict(`A ${input.type} invoice already exists for this load`);
  }

  const issuedAt = new Date();
  const dueAt = computeDueAt(issuedAt, input.paymentTermDays);
  const id = randomUUID();

  const initialStatus: InvoiceStatus = input.type === "broker" ? "sent" : "received";

  const [row] = await executor
    .insert(invoice)
    .values({
      id,
      loadId: input.loadId,
      type: input.type,
      amount: input.amount.toString(),
      issuedAt,
      dueAt,
      paymentTermDays: input.paymentTermDays,
      status: initialStatus,
      fileId: input.fileId ?? null,
      createdBy: input.createdBy,
    })
    .returning();

  if (!row) throw new createError.InternalServerError("Failed to create invoice");

  return mapInvoiceRow(row);
};

export const listInvoicesForLoad = async (loadId: string): Promise<InvoiceRecord[]> => {
  const rows = await db
    .select()
    .from(invoice)
    .where(eq(invoice.loadId, loadId))
    .orderBy(desc(invoice.createdAt));

  return rows.map(mapInvoiceRow);
};

export const getInvoice = async (id: string): Promise<InvoiceRecord | null> => {
  const [row] = await db.select().from(invoice).where(eq(invoice.id, id));
  return row ? mapInvoiceRow(row) : null;
};

export const updateInvoiceStatus = async (
  executor: Executor,
  id: string,
  status: InvoiceStatus,
): Promise<boolean> => {
  const result = await executor
    .update(invoice)
    .set({ status, updatedAt: new Date() })
    .where(eq(invoice.id, id))
    .returning({ id: invoice.id });
  return result.length > 0;
};

export const voidInvoice = async (id: string): Promise<boolean> =>
  updateInvoiceStatus(db, id, "void");

export const markInvoiceOverdue = async (id: string): Promise<boolean> =>
  updateInvoiceStatus(db, id, "overdue");

export const getOverdueInvoices = async (asOf: Date): Promise<InvoiceRecord[]> => {
  const rows = await db
    .select()
    .from(invoice)
    .where(
      and(
        eq(invoice.type, "broker"),
        lt(invoice.dueAt, asOf),
        inArray(invoice.status, ["sent", "received", "overdue"]),
      ),
    );
  return rows.map(mapInvoiceRow);
};

export const getUpcomingCarrierDueInvoices = async (
  asOfPlusDays: number,
): Promise<InvoiceRecord[]> => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + asOfPlusDays);

  const rows = await db
    .select()
    .from(invoice)
    .where(
      and(eq(invoice.type, "carrier"), eq(invoice.status, "received"), lt(invoice.dueAt, cutoff)),
    );
  return rows.map(mapInvoiceRow);
};

export const markReminderSent = async (id: string): Promise<void> => {
  await db
    .update(invoice)
    .set({ lastReminderSentAt: new Date(), updatedAt: new Date() })
    .where(eq(invoice.id, id));
};

export const getInvoicePaidAmount = async (
  executor: Executor,
  invoiceId: string,
): Promise<number> => {
  const [row] = await executor
    .select({ total: sum(payment.amount) })
    .from(payment)
    .where(and(eq(payment.invoiceId, invoiceId), eq(payment.status, "completed")));
  return numericToNumber(row?.total ?? null);
};

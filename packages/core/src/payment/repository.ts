import { randomUUID } from "node:crypto";
import { db, type PaymentRow, type PaymentStatus, payment } from "@twy/db";
import { desc, eq } from "drizzle-orm";
import createError from "http-errors";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type Executor = typeof db | Tx;

export interface CreatePaymentInput {
  invoiceId: string;
  amount: number;
  method?: string | null;
  reference?: string | null;
  recordedBy: string;
}

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  amount: number;
  paidAt: string;
  method: string | null;
  reference: string | null;
  status: PaymentStatus;
  createdAt: string;
}

const mapPaymentRow = (row: PaymentRow): PaymentRecord => ({
  id: row.id,
  invoiceId: row.invoiceId,
  amount: Number(row.amount),
  paidAt: row.paidAt.toISOString(),
  method: row.method ?? null,
  reference: row.reference ?? null,
  status: row.status,
  createdAt: row.createdAt.toISOString(),
});

export const recordPayment = async (
  executor: Executor,
  input: CreatePaymentInput,
): Promise<PaymentRecord> => {
  const id = randomUUID();

  const [row] = await executor
    .insert(payment)
    .values({
      id,
      invoiceId: input.invoiceId,
      amount: input.amount.toString(),
      method: input.method ?? null,
      reference: input.reference ?? null,
      status: "completed",
      recordedBy: input.recordedBy,
    })
    .returning();

  if (!row) throw new createError.InternalServerError("Failed to record payment");

  return mapPaymentRow(row);
};

export const listPaymentsForInvoice = async (invoiceId: string): Promise<PaymentRecord[]> => {
  const rows = await db
    .select()
    .from(payment)
    .where(eq(payment.invoiceId, invoiceId))
    .orderBy(desc(payment.paidAt));

  return rows.map(mapPaymentRow);
};

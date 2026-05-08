import { z } from "zod";
import { AuthContext } from "../shared/auth.js";

const uuidField = z.uuid("Value must be a valid UUID");

export const RecordPaymentEventSchema = z.object({
  requestContext: AuthContext,
  body: z.object({
    invoiceId: uuidField,
    amount: z.number().positive("Amount must be positive"),
    method: z.string().trim().nullable().optional(),
    reference: z.string().trim().nullable().optional(),
  }),
});

export type RecordPaymentEvent = z.infer<typeof RecordPaymentEventSchema>;

export const ListPaymentsEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    invoiceId: uuidField,
  }),
});

export type ListPaymentsEvent = z.infer<typeof ListPaymentsEventSchema>;

import { invoiceTypeValues } from "@twy/db";
import { z } from "zod";
import { AuthContext } from "../shared/auth.js";

const uuidField = z.uuid("Value must be a valid UUID");

const invoiceTypeEnum = z.enum([...invoiceTypeValues] as [
  (typeof invoiceTypeValues)[number],
  ...(typeof invoiceTypeValues)[number][],
]);

export const CreateInvoiceEventSchema = z.object({
  requestContext: AuthContext,
  body: z.object({
    loadId: uuidField,
    type: invoiceTypeEnum,
    amount: z.number().positive("Amount must be positive"),
    paymentTermDays: z.number().int().positive("Payment term must be a positive integer"),
    fileId: uuidField.nullable().optional(),
  }),
});

export type CreateInvoiceEvent = z.infer<typeof CreateInvoiceEventSchema>;

export const ListInvoicesEventSchema = z.object({
  requestContext: AuthContext,
  queryStringParameters: z.object({
    loadId: uuidField.optional(),
    page: z.coerce.number().int().min(0).default(0),
    limit: z.coerce.number().int().min(1).default(20),
  }),
});

export type ListInvoicesEvent = z.infer<typeof ListInvoicesEventSchema>;

export const UpdateInvoiceStatusEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    invoiceId: uuidField,
  }),
  body: z.object({
    status: z.enum(["draft", "sent", "received", "paid", "overdue", "void"]),
  }),
});

export type UpdateInvoiceStatusEvent = z.infer<typeof UpdateInvoiceStatusEventSchema>;

export const DeleteInvoiceEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    invoiceId: uuidField,
  }),
});

export type DeleteInvoiceEvent = z.infer<typeof DeleteInvoiceEventSchema>;

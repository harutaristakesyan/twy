import { paymentStatusValues } from "@twy/db";
import z from "zod";
import { filtersQueryParamSchema } from "../shared/advanced-filter-schema.js";
import { AuthContext } from "../shared/auth.js";

export const paymentStatusSchema = z.enum([...paymentStatusValues] as [
  (typeof paymentStatusValues)[number],
  ...(typeof paymentStatusValues)[number][],
]);

export const ListPaymentOrdersEventSchema = z.object({
  requestContext: AuthContext,
  queryStringParameters: z.object({
    page: z
      .string()
      .transform((val) => Number.parseInt(val, 10))
      .default(0)
      .transform((val) => (Number.isNaN(val) ? 0 : val)),
    limit: z
      .string()
      .transform((val) => Number.parseInt(val, 10))
      .default(20)
      .transform((val) => (Number.isNaN(val) ? 20 : val)),
    query: z.string().optional(),
    filters: filtersQueryParamSchema,
  }),
});

export type ListPaymentOrdersEvent = z.infer<typeof ListPaymentOrdersEventSchema>;

export const UpdatePaymentOrderEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    paymentOrderId: z.uuid("Value must be a valid UUID"),
  }),
  body: z.object({
    paymentStatus: paymentStatusSchema.optional(),
    carrierPaidAmount: z.number().nonnegative().nullable().optional(),
    carrierPaidDate: z.string().date().nullable().optional(),
    brokerReceivedAmount: z.number().nonnegative().nullable().optional(),
    brokerReceivedDate: z.string().date().nullable().optional(),
  }),
});

export type UpdatePaymentOrderEvent = z.infer<typeof UpdatePaymentOrderEventSchema>;

export const AddPaymentOrderFileEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    paymentOrderId: z.uuid("Value must be a valid UUID"),
  }),
  body: z.object({
    fileId: z.uuid("Value must be a valid UUID"),
  }),
});

export type AddPaymentOrderFileEvent = z.infer<typeof AddPaymentOrderFileEventSchema>;

export const RemovePaymentOrderFileEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    paymentOrderId: z.uuid("Value must be a valid UUID"),
    fileId: z.uuid("Value must be a valid UUID"),
  }),
});

export type RemovePaymentOrderFileEvent = z.infer<typeof RemovePaymentOrderFileEventSchema>;

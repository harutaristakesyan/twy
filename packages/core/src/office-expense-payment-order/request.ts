import {
  currencyValues,
  officeExpensePaymentStatusValues,
  officeExpenseServiceValues,
} from "@twy/db";
import z from "zod";
import { filtersQueryParamSchema } from "../shared/advanced-filter-schema.js";
import { AuthContext } from "../shared/auth.js";
import { MAX_FILE_IDS_PER_OFFICE_EXPENSE_CREATE } from "./constants.js";

export const officeExpenseServiceSchema = z.enum([...officeExpenseServiceValues] as [
  (typeof officeExpenseServiceValues)[number],
  ...(typeof officeExpenseServiceValues)[number][],
]);

export const officeExpensePaymentStatusSchema = z.enum([...officeExpensePaymentStatusValues] as [
  (typeof officeExpensePaymentStatusValues)[number],
  ...(typeof officeExpensePaymentStatusValues)[number][],
]);

export const currencySchema = z.enum([...currencyValues] as [
  (typeof currencyValues)[number],
  ...(typeof currencyValues)[number][],
]);

export const CreateOfficeExpenseEventSchema = z.object({
  requestContext: AuthContext,
  body: z.object({
    serviceName: officeExpenseServiceSchema,
    paymentPurpose: z.string().min(1),
    periodStart: z.string().date(),
    periodEnd: z.string().date(),
    amount: z.number().positive(),
    currency: currencySchema.default("USD"),
    fileIds: z
      .array(z.uuid("Value must be a valid UUID"))
      .max(MAX_FILE_IDS_PER_OFFICE_EXPENSE_CREATE)
      .optional(),
  }),
});
export type CreateOfficeExpenseEvent = z.infer<typeof CreateOfficeExpenseEventSchema>;

export const ListOfficeExpensesEventSchema = z.object({
  requestContext: AuthContext,
  queryStringParameters: z.object({
    page: z
      .string()
      .transform((v) => Number.parseInt(v, 10))
      .default(0)
      .transform((v) => (Number.isNaN(v) ? 0 : v)),
    limit: z
      .string()
      .transform((v) => Number.parseInt(v, 10))
      .default(20)
      .transform((v) => (Number.isNaN(v) ? 20 : v)),
    query: z.string().optional(),
    filters: filtersQueryParamSchema,
  }),
});
export type ListOfficeExpensesEvent = z.infer<typeof ListOfficeExpensesEventSchema>;

export const GetOfficeExpenseEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    id: z.uuid("Value must be a valid UUID"),
  }),
});
export type GetOfficeExpenseEvent = z.infer<typeof GetOfficeExpenseEventSchema>;

export const UpdateOfficeExpenseEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    id: z.uuid("Value must be a valid UUID"),
  }),
  body: z.object({
    serviceName: officeExpenseServiceSchema.optional(),
    paymentPurpose: z.string().min(1).optional(),
    periodStart: z.string().date().optional(),
    periodEnd: z.string().date().optional(),
    amount: z.number().positive().optional(),
    currency: currencySchema.optional(),
    paymentStatus: officeExpensePaymentStatusSchema.optional(),
    paymentMadeOn: z.string().date().nullable().optional(),
  }),
});
export type UpdateOfficeExpenseEvent = z.infer<typeof UpdateOfficeExpenseEventSchema>;

export const AddOfficeExpenseFileEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    id: z.uuid("Value must be a valid UUID"),
  }),
  body: z.object({
    fileId: z.uuid("Value must be a valid UUID"),
  }),
});
export type AddOfficeExpenseFileEvent = z.infer<typeof AddOfficeExpenseFileEventSchema>;

export const RemoveOfficeExpenseFileEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    id: z.uuid("Value must be a valid UUID"),
    fileId: z.uuid("Value must be a valid UUID"),
  }),
});
export type RemoveOfficeExpenseFileEvent = z.infer<typeof RemoveOfficeExpenseFileEventSchema>;

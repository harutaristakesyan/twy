import { z } from "zod";
import { AuthContext } from "../shared/auth.js";

const uuidField = z.uuid("Value must be a valid UUID");

const qsp = <T extends z.ZodRawShape>(shape: T) => z.preprocess((v) => v ?? {}, z.object(shape));

export const TwyAccountingEventSchema = z.object({
  requestContext: AuthContext,
  queryStringParameters: qsp({
    branchId: uuidField.optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    page: z.coerce.number().int().min(0).default(0),
    limit: z.coerce.number().int().min(1).default(20),
  }),
});

export type TwyAccountingEvent = z.infer<typeof TwyAccountingEventSchema>;

export const ExternalBillingEventSchema = z.object({
  requestContext: AuthContext,
  queryStringParameters: qsp({
    branchId: uuidField.optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  }),
});

export type ExternalBillingEvent = z.infer<typeof ExternalBillingEventSchema>;

export const InternalBillingEventSchema = z.object({
  requestContext: AuthContext,
  queryStringParameters: qsp({
    branchId: uuidField.optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    page: z.coerce.number().int().min(0).default(0),
    limit: z.coerce.number().int().min(1).default(20),
  }),
});

export type InternalBillingEvent = z.infer<typeof InternalBillingEventSchema>;

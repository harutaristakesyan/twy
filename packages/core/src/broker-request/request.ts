import z from "zod";
import { filtersQueryParamSchema } from "../shared/advanced-filter-schema.js";
import { AuthContext } from "../shared/auth.js";

const uuidField = z.uuid("Value must be a valid UUID");

export const brokerRequestSortFieldMap = {
  createdAt: "createdAt",
  brokerName: "brokerName",
  mcNumber: "mcNumber",
  status: "status",
} as const;

export const brokerRequestSortOrderMap = {
  ascend: "asc",
  descend: "desc",
} as const;

const listStatusFilterValues = ["pending", "approved", "rejected", "all"] as const;
const listStatusEnum = z.enum(listStatusFilterValues);

export const ListBrokerRequestsEventSchema = z.object({
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
      .default(10)
      .transform((val) => (Number.isNaN(val) ? 10 : val)),
    sortField: z
      .enum(Object.keys(brokerRequestSortFieldMap) as [keyof typeof brokerRequestSortFieldMap])
      .default("createdAt")
      .transform((val) => brokerRequestSortFieldMap[val]),
    sortOrder: z
      .enum(Object.keys(brokerRequestSortOrderMap) as [keyof typeof brokerRequestSortOrderMap])
      .default("descend")
      .transform((val) => brokerRequestSortOrderMap[val]),
    status: listStatusEnum.default("all"),
    query: z.string().optional(),
    filters: filtersQueryParamSchema,
  }),
});

export type ListBrokerRequestsEvent = z.infer<typeof ListBrokerRequestsEventSchema>;

export const SubmitBrokerRequestEventSchema = z.object({
  requestContext: AuthContext,
  body: z.object({
    brokerName: z.string().trim().min(2, "Broker name must be at least 2 characters"),
    mcNumber: z.string().trim().min(1, "MC number is required"),
    contactName: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    email: z.string().trim().email().optional(),
    address: z.string().trim().optional(),
    notes: z.string().trim().optional(),
    creditLimitUnlimited: z.boolean().default(true),
    creditLimit: z.number().positive().nullable().optional(),
  }),
});

export type SubmitBrokerRequestEvent = z.infer<typeof SubmitBrokerRequestEventSchema>;

export const ApproveBrokerRequestEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    requestId: uuidField,
  }),
});

export type ApproveBrokerRequestEvent = z.infer<typeof ApproveBrokerRequestEventSchema>;

export const RejectBrokerRequestEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    requestId: uuidField,
  }),
  body: z
    .object({
      rejectionReason: z.string().trim().max(2000).optional(),
    })
    .default({}),
});

export type RejectBrokerRequestEvent = z.infer<typeof RejectBrokerRequestEventSchema>;

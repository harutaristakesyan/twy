import { brokerStatusValues } from "@twy/db";
import z from "zod";
import { filtersQueryParamSchema } from "../shared/advanced-filter-schema.js";
import { AuthContext } from "../shared/auth.js";

const brokerStatusEnum = z.enum([...brokerStatusValues] as [
  (typeof brokerStatusValues)[number],
  ...(typeof brokerStatusValues)[number][],
]);

const uuidField = z.uuid("Value must be a valid UUID");

export const brokerSortFieldMap = {
  brokerName: "brokerName",
  mcNumber: "mcNumber",
  createdAt: "createdAt",
} as const;

export const brokerSortOrderMap = {
  ascend: "asc",
  descend: "desc",
} as const;

export const ListBrokersEventSchema = z.object({
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
      .enum(Object.keys(brokerSortFieldMap) as [keyof typeof brokerSortFieldMap])
      .default("createdAt")
      .transform((val) => brokerSortFieldMap[val as keyof typeof brokerSortFieldMap]),
    sortOrder: z
      .enum(Object.keys(brokerSortOrderMap) as [keyof typeof brokerSortOrderMap])
      .default("descend")
      .transform((val) => brokerSortOrderMap[val as keyof typeof brokerSortOrderMap]),
    query: z.string().optional(),
    filters: filtersQueryParamSchema,
  }),
});

export type ListBrokersEvent = z.infer<typeof ListBrokersEventSchema>;

const UpdateBrokerPayloadSchema = z
  .object({
    brokerName: z.string().trim().min(2).optional(),
    mcNumber: z.string().trim().min(1).optional(),
    contactName: z.string().trim().nullable().optional(),
    phone: z.string().trim().nullable().optional(),
    email: z.string().trim().email().nullable().optional(),
    address: z.string().trim().nullable().optional(),
    notes: z.string().trim().nullable().optional(),
    status: brokerStatusEnum.optional(),
    creditLimitUnlimited: z.boolean().optional(),
    creditLimit: z.number().positive().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided to update the broker",
  });

export const UpdateBrokerEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    brokerId: uuidField,
  }),
  body: UpdateBrokerPayloadSchema,
});

export type UpdateBrokerEvent = z.infer<typeof UpdateBrokerEventSchema>;

export const DeleteBrokerEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    brokerId: uuidField,
  }),
});

export type DeleteBrokerEvent = z.infer<typeof DeleteBrokerEventSchema>;

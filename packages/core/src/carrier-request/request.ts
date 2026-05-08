import { carrierKindValues, insuranceStatusValues } from "@twy/db";
import z from "zod";
import { filtersQueryParamSchema } from "../shared/advanced-filter-schema.js";
import { AuthContext } from "../shared/auth.js";

const carrierKindEnum = z.enum([...carrierKindValues] as [
  (typeof carrierKindValues)[number],
  ...(typeof carrierKindValues)[number][],
]);

const insuranceStatusEnum = z.enum([...insuranceStatusValues] as [
  (typeof insuranceStatusValues)[number],
  ...(typeof insuranceStatusValues)[number][],
]);

const uuidField = z.uuid("Value must be a valid UUID");

export const carrierRequestSortFieldMap = {
  createdAt: "createdAt",
  carrierName: "carrierName",
  mcDotNumber: "mcDotNumber",
  status: "status",
} as const;

export const carrierRequestSortOrderMap = {
  ascend: "asc",
  descend: "desc",
} as const;

const listStatusFilterValues = ["pending", "approved", "rejected", "all"] as const;
const listStatusEnum = z.enum(listStatusFilterValues);

export const ListCarrierRequestsEventSchema = z.object({
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
      .enum(Object.keys(carrierRequestSortFieldMap) as [keyof typeof carrierRequestSortFieldMap])
      .default("createdAt")
      .transform((val) => carrierRequestSortFieldMap[val]),
    sortOrder: z
      .enum(Object.keys(carrierRequestSortOrderMap) as [keyof typeof carrierRequestSortOrderMap])
      .default("descend")
      .transform((val) => carrierRequestSortOrderMap[val]),
    status: listStatusEnum.default("all"),
    query: z.string().optional(),
    filters: filtersQueryParamSchema,
  }),
});

export type ListCarrierRequestsEvent = z.infer<typeof ListCarrierRequestsEventSchema>;

export const SubmitCarrierRequestEventSchema = z.object({
  requestContext: AuthContext,
  body: z.object({
    kind: carrierKindEnum,
    carrierName: z.string().trim().min(2, "Carrier name must be at least 2 characters"),
    mcDotNumber: z.string().trim().min(1, "MC/DOT number is required"),
    equipmentType: z.string().trim().min(1, "Equipment type is required"),
    insuranceStatus: insuranceStatusEnum.optional(),
    insuranceExpiry: z.string().datetime().nullable().optional(),
    phone: z.string().trim().min(1, "Phone is required"),
    email: z.string().trim().email("Please enter a valid email address"),
    notes: z.string().trim().optional(),
  }),
});

export type SubmitCarrierRequestEvent = z.infer<typeof SubmitCarrierRequestEventSchema>;

export const ApproveCarrierRequestEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    requestId: uuidField,
  }),
});

export type ApproveCarrierRequestEvent = z.infer<typeof ApproveCarrierRequestEventSchema>;

export const RejectCarrierRequestEventSchema = z.object({
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

export type RejectCarrierRequestEvent = z.infer<typeof RejectCarrierRequestEventSchema>;

import { carrierKindValues, carrierStatusValues, insuranceStatusValues } from "@twy/db";
import z from "zod";
import { filtersQueryParamSchema } from "../shared/advanced-filter-schema.js";
import { AuthContext } from "../shared/auth.js";

const carrierKindEnum = z.enum([...carrierKindValues] as [
  (typeof carrierKindValues)[number],
  ...(typeof carrierKindValues)[number][],
]);

const carrierStatusEnum = z.enum([...carrierStatusValues] as [
  (typeof carrierStatusValues)[number],
  ...(typeof carrierStatusValues)[number][],
]);

const insuranceStatusEnum = z.enum([...insuranceStatusValues] as [
  (typeof insuranceStatusValues)[number],
  ...(typeof insuranceStatusValues)[number][],
]);

const uuidField = z.uuid("Value must be a valid UUID");

export const carrierSortFieldMap = {
  carrierName: "carrierName",
  mcDotNumber: "mcDotNumber",
  status: "status",
  insuranceStatus: "insuranceStatus",
  createdAt: "createdAt",
} as const;

export const carrierSortOrderMap = {
  ascend: "asc",
  descend: "desc",
} as const;

export const ListCarriersEventSchema = z.object({
  requestContext: AuthContext,
  queryStringParameters: z.object({
    kind: carrierKindEnum,
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
      .enum(Object.keys(carrierSortFieldMap) as [keyof typeof carrierSortFieldMap])
      .default("createdAt")
      .transform((val) => carrierSortFieldMap[val as keyof typeof carrierSortFieldMap]),
    sortOrder: z
      .enum(Object.keys(carrierSortOrderMap) as [keyof typeof carrierSortOrderMap])
      .default("descend")
      .transform((val) => carrierSortOrderMap[val as keyof typeof carrierSortOrderMap]),
    query: z.string().optional(),
    filters: filtersQueryParamSchema,
  }),
});

export type ListCarriersEvent = z.infer<typeof ListCarriersEventSchema>;

export const GetCarrierEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    carrierId: uuidField,
  }),
});

export type GetCarrierEvent = z.infer<typeof GetCarrierEventSchema>;

const CarrierBaseSchema = z.object({
  kind: carrierKindEnum,
  carrierName: z.string().trim().min(2, "Carrier name must be at least 2 characters"),
  mcDotNumber: z.string().trim().min(1, "MC/DOT number is required"),
  equipmentType: z.string().trim().min(1, "Equipment type is required"),
  insuranceStatus: insuranceStatusEnum.optional(),
  insuranceExpiry: z.string().datetime().nullable().optional(),
  phone: z.string().trim().min(1, "Phone is required"),
  email: z.string().trim().email("Please enter a valid email address"),
  notes: z.string().trim().optional(),
  status: carrierStatusEnum.optional(),
});

export const CreateCarrierEventSchema = z.object({
  requestContext: AuthContext,
  body: CarrierBaseSchema,
});

export type CreateCarrierEvent = z.infer<typeof CreateCarrierEventSchema>;

const UpdateCarrierPayloadSchema = z
  .object({
    carrierName: z.string().trim().min(2).optional(),
    mcDotNumber: z.string().trim().min(1).optional(),
    equipmentType: z.string().trim().nullable().optional(),
    insuranceStatus: insuranceStatusEnum.nullable().optional(),
    insuranceExpiry: z.string().datetime().nullable().optional(),
    phone: z.string().trim().nullable().optional(),
    email: z.string().trim().email().nullable().optional(),
    notes: z.string().trim().nullable().optional(),
    status: carrierStatusEnum.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided to update the carrier",
  });

export const UpdateCarrierEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    carrierId: uuidField,
  }),
  body: UpdateCarrierPayloadSchema,
});

export type UpdateCarrierEvent = z.infer<typeof UpdateCarrierEventSchema>;

export const DeleteCarrierEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    carrierId: uuidField,
  }),
});

export type DeleteCarrierEvent = z.infer<typeof DeleteCarrierEventSchema>;

import z from "zod";
import { AuthContext } from "../shared/auth.js";

const CIBaseSchema = z.object({
  ciNumber: z
    .string()
    .trim()
    .min(1, "CI number is required")
    .max(50, "CI number must be at most 50 characters"),
  validFrom: z.iso.date("validFrom must be a valid date"),
  validTo: z.iso.date("validTo must be a valid date").nullable().optional(),
});

const validateDateRange = (validFrom: string | undefined, validTo: string | null | undefined) => {
  if (validFrom && validTo && validFrom > validTo) return false;
  return true;
};
const ciDateRangeError = { message: "validTo must be on or after validFrom", path: ["validTo"] };

const ciSortFieldMap = {
  ciNumber: "ciNumber",
  validFrom: "validFrom",
  createdAt: "createdAt",
} as const;

const ciSortOrderMap = {
  ascend: "asc",
  descend: "desc",
} as const;

export const ListCommunityLicensesEventSchema = z.object({
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
      .enum(Object.keys(ciSortFieldMap) as [keyof typeof ciSortFieldMap])
      .default("createdAt")
      .transform((val) => ciSortFieldMap[val as keyof typeof ciSortFieldMap]),
    sortOrder: z
      .enum(Object.keys(ciSortOrderMap) as [keyof typeof ciSortOrderMap])
      .default("descend")
      .transform((val) => ciSortOrderMap[val as keyof typeof ciSortOrderMap]),
    query: z.string().optional(),
  }),
});

export type ListCommunityLicensesEvent = z.infer<typeof ListCommunityLicensesEventSchema>;

export const CreateCommunityLicenseEventSchema = z.object({
  requestContext: AuthContext,
  body: CIBaseSchema.refine(
    (data) => validateDateRange(data.validFrom, data.validTo),
    ciDateRangeError,
  ),
});

export type CreateCommunityLicenseEvent = z.infer<typeof CreateCommunityLicenseEventSchema>;

const UpdateCIPayloadSchema = z
  .object({
    ciNumber: z.string().trim().min(1).max(50).optional(),
    validFrom: z.iso.date().optional(),
    validTo: z.iso.date().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided to update",
  })
  .refine((data) => validateDateRange(data.validFrom, data.validTo), ciDateRangeError);

export const UpdateCommunityLicenseEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    ciId: z.uuid("ciId must be a valid UUID"),
  }),
  body: UpdateCIPayloadSchema,
});

export type UpdateCommunityLicenseEvent = z.infer<typeof UpdateCommunityLicenseEventSchema>;

export const DeleteCommunityLicenseEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    ciId: z.uuid("ciId must be a valid UUID"),
  }),
});

export type DeleteCommunityLicenseEvent = z.infer<typeof DeleteCommunityLicenseEventSchema>;

export const GetCommunityLicenseEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    ciId: z.uuid("ciId must be a valid UUID"),
  }),
});

export type GetCommunityLicenseEvent = z.infer<typeof GetCommunityLicenseEventSchema>;

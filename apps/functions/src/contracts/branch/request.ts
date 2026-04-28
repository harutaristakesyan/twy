import { AuthContext } from "@contracts/common/auth";
import z from "zod";

const BranchBaseSchema = z.object({
  name: z.string().trim().min(1, "Branch name is required"),
  owner: z.string().trim().min(1, "Owner is required"),
  contact: z.string().trim().min(1).optional(),
});

export const sortFieldMap = {
  name: "name",
  contact: "contact",
  createdAt: "createdAt",
} as const;

export const sortOrderMap = {
  ascend: "asc",
  descend: "desc",
} as const;

export const ListBranchesEventSchema = z.object({
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
      .default(5)
      .transform((val) => (Number.isNaN(val) ? 5 : val)),
    sortField: z
      .enum(Object.keys(sortFieldMap) as [keyof typeof sortFieldMap])
      .default("createdAt")
      .transform((val) => sortFieldMap[val as keyof typeof sortFieldMap]),
    sortOrder: z
      .enum(Object.keys(sortOrderMap) as [keyof typeof sortOrderMap])
      .default("descend")
      .transform((val) => sortOrderMap[val as keyof typeof sortOrderMap]),
    query: z.string().optional(),
  }),
});

export type ListBranchesEvent = z.infer<typeof ListBranchesEventSchema>;

export const CreateBranchEventSchema = z.object({
  requestContext: AuthContext,
  body: BranchBaseSchema,
});

export type CreateBranchEvent = z.infer<typeof CreateBranchEventSchema>;

const UpdateBranchPayloadSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    owner: z.string().trim().min(1).nullable().optional(),
    contact: z.string().trim().min(1).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided to update the branch",
  });

export const UpdateBranchEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    branchId: z.uuid("branchId must be a valid UUID"),
  }),
  body: UpdateBranchPayloadSchema,
});

export type UpdateBranchEvent = z.infer<typeof UpdateBranchEventSchema>;

export const DeleteBranchEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    branchId: z.uuid("branchId must be a valid UUID"),
  }),
});

export type DeleteBranchEvent = z.infer<typeof DeleteBranchEventSchema>;

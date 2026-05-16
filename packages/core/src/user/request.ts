import z from "zod";
import { filtersQueryParamSchema } from "../shared/advanced-filter-schema.js";
import { AuthContext } from "../shared/auth.js";

export const userSortFieldMap = {
  firstName: "users.firstName",
  lastName: "users.lastName",
  email: "users.email",
  isActive: "users.isActive",
  createdAt: "users.createdAt",
  branch: "branch.name",
} as const;

export const userSortOrderMap = {
  ascend: "asc",
  descend: "desc",
} as const;

export const ListUsersEventSchema = z.object({
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
      .enum(Object.keys(userSortFieldMap) as [keyof typeof userSortFieldMap])
      .default("createdAt")
      .transform((val) => userSortFieldMap[val as keyof typeof userSortFieldMap]),
    sortOrder: z
      .enum(Object.keys(userSortOrderMap) as [keyof typeof userSortOrderMap])
      .default("descend")
      .transform((val) => userSortOrderMap[val as keyof typeof userSortOrderMap]),
    query: z.string().optional(),
    filters: filtersQueryParamSchema,
  }),
});

export type ListUsersEvent = z.infer<typeof ListUsersEventSchema>;

export const GetUserEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    userId: z.uuid("userId must be a valid Cognito user identifier"),
  }),
});

export type GetUserEvent = z.infer<typeof GetUserEventSchema>;

const UpdateUserPayloadSchema = z
  .object({
    branch: z.uuid("branch must be a valid UUID").nullable().optional(),
    teamId: z.uuid("teamId must be a valid UUID").nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided to update the user",
  });

export const UpdateUserEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    userId: z.uuid("userId must be a valid Cognito user identifier"),
  }),
  body: UpdateUserPayloadSchema,
});

export type UpdateUserEvent = z.infer<typeof UpdateUserEventSchema>;

export const DeleteUserEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    userId: z.uuid("userId must be a valid Cognito user identifier"),
  }),
});

export type DeleteUserEvent = z.infer<typeof DeleteUserEventSchema>;

const SelfUpdateUserPayloadSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required").optional(),
    lastName: z.string().trim().min(1, "Last name is required").optional(),
    profilePictureFileId: z.uuid("profilePictureFileId must be a valid UUID").nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided to update the user",
  });

export const SelfUpdateUserEventSchema = z.object({
  requestContext: AuthContext,
  body: SelfUpdateUserPayloadSchema,
});

export type SelfUpdateUserEvent = z.infer<typeof SelfUpdateUserEventSchema>;

export const CreateUserEventSchema = z.object({
  requestContext: AuthContext,
  body: z.object({
    email: z.string().email("Must be a valid email"),
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: z.string().trim().min(1, "Last name is required"),
    branch: z.uuid("branch must be a valid UUID").nullable().optional(),
    teamId: z.uuid("teamId must be a valid UUID").nullable().optional(),
    isActive: z.boolean(),
  }),
});

export type CreateUserEvent = z.infer<typeof CreateUserEventSchema>;

import z from "zod";
import { filtersQueryParamSchema } from "../shared/advanced-filter-schema.js";
import { AuthContext } from "../shared/auth.js";
import { RESOURCES } from "./contracts.js";

const uuidField = z.uuid("Value must be a valid UUID");

const teamSortOrderMap = {
  ascend: "asc",
  descend: "desc",
} as const;

export const ListTeamsEventSchema = z.object({
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
    sortOrder: z
      .enum(Object.keys(teamSortOrderMap) as [keyof typeof teamSortOrderMap])
      .default("descend")
      .transform((val) => teamSortOrderMap[val as keyof typeof teamSortOrderMap]),
    query: z.string().optional(),
    filters: filtersQueryParamSchema,
  }),
});

export type ListTeamsEvent = z.infer<typeof ListTeamsEventSchema>;

const PermissionsInputSchema = z
  .record(z.enum([...RESOURCES] as [string, ...string[]]), z.record(z.string(), z.boolean()))
  .optional();

const TeamBaseSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().optional(),
  branchRestricted: z.boolean().default(false),
  onlyOwnData: z.boolean().default(false),
  permissions: PermissionsInputSchema,
});

export const CreateTeamEventSchema = z.object({
  requestContext: AuthContext,
  body: TeamBaseSchema,
});

export type CreateTeamEvent = z.infer<typeof CreateTeamEventSchema>;

export const UpdateTeamEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    teamId: uuidField,
  }),
  body: TeamBaseSchema.partial().refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  }),
});

export type UpdateTeamEvent = z.infer<typeof UpdateTeamEventSchema>;

export const DeleteTeamEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    teamId: uuidField,
  }),
});

export type DeleteTeamEvent = z.infer<typeof DeleteTeamEventSchema>;

export const GetTeamEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    teamId: uuidField,
  }),
});

export type GetTeamEvent = z.infer<typeof GetTeamEventSchema>;

export const ListTeamMembersEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    teamId: uuidField,
  }),
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
    query: z.string().optional(),
  }),
});

export type ListTeamMembersEvent = z.infer<typeof ListTeamMembersEventSchema>;

export const AddTeamMemberEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    teamId: uuidField,
  }),
  body: z.object({
    userId: uuidField,
  }),
});

export type AddTeamMemberEvent = z.infer<typeof AddTeamMemberEventSchema>;

export const RemoveTeamMemberEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    teamId: uuidField,
    userId: uuidField,
  }),
});

export type RemoveTeamMemberEvent = z.infer<typeof RemoveTeamMemberEventSchema>;

export const ListUnassignedUsersEventSchema = z.object({
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
  }),
});

export type ListUnassignedUsersEvent = z.infer<typeof ListUnassignedUsersEventSchema>;

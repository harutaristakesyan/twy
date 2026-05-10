import { db, team, teamPermissions, users } from "@twy/db";
import type { SQL } from "drizzle-orm";
import { and, asc, count, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import createError from "http-errors";
import { putAuthContext } from "../auth-context/store.js";
import type { AdvancedFilter } from "../shared/advanced-filter-schema.js";
import {
  ACTIONS,
  type Action,
  emptyPermissionsMap,
  type PermissionsMap,
  RESOURCES,
  type Resource,
  TWY_TEAM_ID,
} from "./contracts.js";
import type { TeamMemberResponse, TeamResponse } from "./response.js";

export interface CreateTeamInput {
  name: string;
  description?: string;
  branchRestricted?: boolean;
  onlyOwnData?: boolean;
  permissions?: Partial<Record<Resource, Partial<Record<Action, boolean>>>>;
}

export interface UpdateTeamInput {
  name?: string;
  description?: string;
  branchRestricted?: boolean;
  onlyOwnData?: boolean;
  permissions?: Partial<Record<Resource, Partial<Record<Action, boolean>>>>;
}

export interface ListTeamsInput {
  page: number;
  limit: number;
  sortOrder: "asc" | "desc";
  query?: string;
  advancedFilter?: AdvancedFilter;
}

export interface UserPermissionsContext {
  userId: string;
  teamId: string | null;
  branchId: string | null;
  branchRestricted: boolean;
  onlyOwnData: boolean;
  permissions: PermissionsMap;
}

function buildPermissionsMap(
  rows: { resource: string; action: string; allowed: boolean }[],
): PermissionsMap {
  const map = emptyPermissionsMap();
  for (const row of rows) {
    const resource = row.resource as Resource;
    const action = row.action as Action;
    if (RESOURCES.includes(resource) && ACTIONS.includes(action)) {
      map[resource][action] = row.allowed;
    }
  }
  return map;
}

function formatTeamRow(
  row: typeof team.$inferSelect,
  permRows: { resource: string; action: string; allowed: boolean }[],
  memberCount: number,
): TeamResponse {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    branchRestricted: row.branchRestricted,
    onlyOwnData: row.onlyOwnData,
    permissions: buildPermissionsMap(permRows),
    memberCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function upsertPermissions(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  teamId: string,
  permissions: Partial<Record<Resource, Partial<Record<Action, boolean>>>>,
) {
  const rows: { teamId: string; resource: string; action: string; allowed: boolean }[] = [];
  for (const resource of RESOURCES) {
    for (const action of ACTIONS) {
      const allowed = permissions[resource]?.[action];
      if (typeof allowed === "boolean") {
        rows.push({ teamId, resource, action, allowed });
      }
    }
  }
  if (rows.length === 0) return;
  await tx
    .insert(teamPermissions)
    .values(rows)
    .onConflictDoUpdate({
      target: [teamPermissions.teamId, teamPermissions.resource, teamPermissions.action],
      set: { allowed: sql`excluded.allowed` },
    });
}

export const createTeam = async (input: CreateTeamInput): Promise<string> => {
  return db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(team)
      .values({
        name: input.name,
        description: input.description ?? null,
        branchRestricted: input.branchRestricted ?? false,
        onlyOwnData: input.onlyOwnData ?? false,
      })
      .returning({ id: team.id });

    if (!inserted) throw new createError.InternalServerError("Failed to create team");

    const permRows: { teamId: string; resource: string; action: string; allowed: boolean }[] = [];
    for (const resource of RESOURCES) {
      for (const action of ACTIONS) {
        permRows.push({
          teamId: inserted.id,
          resource,
          action,
          allowed: input.permissions?.[resource]?.[action] ?? false,
        });
      }
    }
    await tx.insert(teamPermissions).values(permRows);

    return inserted.id;
  });
};

export const updateTeam = async (teamId: string, input: UpdateTeamInput): Promise<void> => {
  const [existing] = await db.select({ id: team.id }).from(team).where(eq(team.id, teamId));
  if (!existing) throw new createError.NotFound(`Team ${teamId} not found`);

  await db.transaction(async (tx) => {
    const payload: Partial<typeof team.$inferInsert> = {};
    if (typeof input.name !== "undefined") payload.name = input.name;
    if (Object.hasOwn(input, "description")) payload.description = input.description ?? null;
    if (typeof input.branchRestricted !== "undefined")
      payload.branchRestricted = input.branchRestricted;
    if (typeof input.onlyOwnData !== "undefined") payload.onlyOwnData = input.onlyOwnData;

    if (Object.keys(payload).length > 0) {
      payload.updatedAt = new Date();
      await tx.update(team).set(payload).where(eq(team.id, teamId));
    }

    if (input.permissions) {
      await upsertPermissions(tx, teamId, input.permissions);
    }
  });

  // Rebuild fire-and-forget — each member isolated so one failure doesn't skip the rest.
  db.select({ id: users.id })
    .from(users)
    .where(eq(users.teamId, teamId))
    .then((members) =>
      Promise.allSettled(
        members.map(async (m) => {
          const ctx = await getEffectivePermissionsForUser(m.id);
          await putAuthContext(ctx);
        }),
      ),
    )
    .catch((err) => {
      console.warn("auth-context rebuild after updateTeam failed:", err);
    });
};

export const deleteTeam = async (teamId: string): Promise<void> => {
  if (teamId === TWY_TEAM_ID) {
    throw new createError.Conflict("The system team cannot be deleted");
  }

  const [memberCount] = await db
    .select({ value: count() })
    .from(users)
    .where(eq(users.teamId, teamId));

  if (Number(memberCount?.value ?? 0) > 0) {
    throw new createError.Conflict("Cannot delete a team that has members assigned to it");
  }

  await db.delete(team).where(eq(team.id, teamId));
};

export const getTeamWithPermissions = async (teamId: string): Promise<TeamResponse | null> => {
  const [teamRow] = await db.select().from(team).where(eq(team.id, teamId));
  if (!teamRow) return null;

  const [permRows, memberRows] = await Promise.all([
    db
      .select({
        resource: teamPermissions.resource,
        action: teamPermissions.action,
        allowed: teamPermissions.allowed,
      })
      .from(teamPermissions)
      .where(eq(teamPermissions.teamId, teamId)),
    db.select({ value: count() }).from(users).where(eq(users.teamId, teamId)),
  ]);

  return formatTeamRow(teamRow, permRows, Number(memberRows[0]?.value ?? 0));
};

const buildTeamAdvancedClause = (filter: AdvancedFilter | undefined): SQL<unknown> | undefined => {
  if (!filter) return undefined;
  const conds: SQL<unknown>[] = [];
  if (filter.branchRestricted !== undefined)
    conds.push(eq(team.branchRestricted, filter.branchRestricted === "true"));
  if (filter.onlyOwnData !== undefined)
    conds.push(eq(team.onlyOwnData, filter.onlyOwnData === "true"));
  if (conds.length === 0) return undefined;
  return and(...conds);
};

export const listTeams = async (
  input: ListTeamsInput,
): Promise<{ teams: TeamResponse[]; total: number }> => {
  const direction = input.sortOrder === "asc" ? asc : desc;
  const offset = input.page * input.limit;
  const searchClause = input.query ? ilike(team.name, `%${input.query}%`) : undefined;
  const filterClause = buildTeamAdvancedClause(input.advancedFilter);
  const whereClause = and(searchClause, filterClause);

  const [teamRows, totalRows] = await Promise.all([
    db
      .select()
      .from(team)
      .where(whereClause)
      .orderBy(direction(team.name))
      .limit(input.limit)
      .offset(offset),
    db.select({ value: count() }).from(team).where(whereClause),
  ]);

  if (teamRows.length === 0) {
    return { teams: [], total: Number(totalRows[0]?.value ?? 0) };
  }

  const teamIds = teamRows.map((t) => t.id);

  const [permRows, memberRows] = await Promise.all([
    db
      .select({
        teamId: teamPermissions.teamId,
        resource: teamPermissions.resource,
        action: teamPermissions.action,
        allowed: teamPermissions.allowed,
      })
      .from(teamPermissions)
      .where(inArray(teamPermissions.teamId, teamIds)),
    db
      .select({ teamId: users.teamId, value: count() })
      .from(users)
      .where(inArray(users.teamId, teamIds))
      .groupBy(users.teamId),
  ]);

  const permsByTeam = new Map<string, { resource: string; action: string; allowed: boolean }[]>();
  for (const row of permRows) {
    const list = permsByTeam.get(row.teamId) ?? [];
    list.push({ resource: row.resource, action: row.action, allowed: row.allowed });
    permsByTeam.set(row.teamId, list);
  }

  const membersByTeam = new Map<string, number>();
  for (const row of memberRows) {
    if (row.teamId) membersByTeam.set(row.teamId, Number(row.value));
  }

  return {
    teams: teamRows.map((t) =>
      formatTeamRow(t, permsByTeam.get(t.id) ?? [], membersByTeam.get(t.id) ?? 0),
    ),
    total: Number(totalRows[0]?.value ?? 0),
  };
};

export interface ListTeamMembersInput {
  teamId: string;
  page: number;
  limit: number;
  query?: string;
}

export const listTeamMembers = async (
  input: ListTeamMembersInput,
): Promise<{ items: TeamMemberResponse[]; total: number }> => {
  const offset = input.page * input.limit;
  const searchClause = input.query
    ? or(
        ilike(users.firstName, `%${input.query}%`),
        ilike(users.lastName, `%${input.query}%`),
        ilike(users.email, `%${input.query}%`),
      )
    : undefined;

  const whereClause = searchClause
    ? and(eq(users.teamId, input.teamId), searchClause)
    : eq(users.teamId, input.teamId);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        isActive: users.isActive,
      })
      .from(users)
      .where(whereClause)
      .orderBy(asc(users.firstName))
      .limit(input.limit)
      .offset(offset),
    db.select({ value: count() }).from(users).where(whereClause),
  ]);

  return { items: rows, total: Number(totalRows[0]?.value ?? 0) };
};

export interface ListUnassignedUsersInput {
  page: number;
  limit: number;
  query?: string;
}

export const listUnassignedUsers = async (
  input: ListUnassignedUsersInput,
): Promise<{ items: TeamMemberResponse[]; total: number }> => {
  const offset = input.page * input.limit;
  const baseClause = isNull(users.teamId);
  const searchClause = input.query
    ? or(
        ilike(users.firstName, `%${input.query}%`),
        ilike(users.lastName, `%${input.query}%`),
        ilike(users.email, `%${input.query}%`),
      )
    : undefined;

  const whereClause = searchClause ? and(baseClause, searchClause) : baseClause;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        isActive: users.isActive,
      })
      .from(users)
      .where(whereClause)
      .orderBy(asc(users.firstName))
      .limit(input.limit)
      .offset(offset),
    db.select({ value: count() }).from(users).where(whereClause),
  ]);

  return { items: rows, total: Number(totalRows[0]?.value ?? 0) };
};

export const addMemberToTeam = async (teamId: string, userId: string): Promise<void> => {
  const [teamRow] = await db.select({ id: team.id }).from(team).where(eq(team.id, teamId));
  if (!teamRow) throw new createError.NotFound("Team not found");

  const [userRow] = await db
    .select({ id: users.id, teamId: users.teamId })
    .from(users)
    .where(eq(users.id, userId));

  if (!userRow) throw new createError.NotFound("User not found");
  if (userRow.teamId && userRow.teamId !== teamId) {
    throw new createError.Conflict("User is already a member of another team");
  }
  if (userRow.teamId === teamId) return;

  await db.update(users).set({ teamId, updatedAt: new Date() }).where(eq(users.id, userId));

  getEffectivePermissionsForUser(userId)
    .then((ctx) => putAuthContext(ctx))
    .catch((err) => {
      console.warn("auth-context rebuild after addMemberToTeam failed:", err);
    });
};

export const removeMemberFromTeam = async (teamId: string, userId: string): Promise<void> => {
  const [userRow] = await db
    .select({ id: users.id, teamId: users.teamId })
    .from(users)
    .where(eq(users.id, userId));

  if (!userRow) throw new createError.NotFound("User not found");
  if (userRow.teamId !== teamId)
    throw new createError.NotFound("User is not a member of this team");

  await db.update(users).set({ teamId: null, updatedAt: new Date() }).where(eq(users.id, userId));

  getEffectivePermissionsForUser(userId)
    .then((ctx) => putAuthContext(ctx))
    .catch((err) => {
      console.warn("auth-context rebuild after removeMemberFromTeam failed:", err);
    });
};

export const getEffectivePermissionsForUser = async (
  userId: string,
): Promise<UserPermissionsContext> => {
  const [userRow] = await db
    .select({ teamId: users.teamId, branch: users.branch })
    .from(users)
    .where(eq(users.id, userId));

  if (!userRow?.teamId) {
    return {
      userId,
      teamId: null,
      branchId: userRow?.branch ?? null,
      branchRestricted: false,
      onlyOwnData: false,
      permissions: emptyPermissionsMap(),
    };
  }

  const [teamRow, permRows] = await Promise.all([
    db
      .select({ branchRestricted: team.branchRestricted, onlyOwnData: team.onlyOwnData })
      .from(team)
      .where(eq(team.id, userRow.teamId))
      .then((rows) => rows[0]),
    db
      .select({
        resource: teamPermissions.resource,
        action: teamPermissions.action,
        allowed: teamPermissions.allowed,
      })
      .from(teamPermissions)
      .where(and(eq(teamPermissions.teamId, userRow.teamId), eq(teamPermissions.allowed, true))),
  ]);

  return {
    userId,
    teamId: userRow.teamId,
    branchId: userRow.branch ?? null,
    branchRestricted: teamRow?.branchRestricted ?? false,
    onlyOwnData: teamRow?.onlyOwnData ?? false,
    permissions: buildPermissionsMap(permRows),
  };
};

import { db, users } from "@twy/db";
import { eq } from "drizzle-orm";
import { getEffectivePermissionsForUser } from "../team/repository.js";
import { putAuthContext } from "./store.js";

export const rebuildAuthContext = async (userId: string): Promise<void> => {
  const ctx = await getEffectivePermissionsForUser(userId);
  await putAuthContext(ctx);
};

export const rebuildAuthContextForTeam = async (teamId: string): Promise<void> => {
  const members = await db.select({ id: users.id }).from(users).where(eq(users.teamId, teamId));
  await Promise.allSettled(members.map((m) => rebuildAuthContext(m.id)));
};

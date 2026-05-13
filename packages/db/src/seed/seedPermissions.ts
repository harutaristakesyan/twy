import { and, eq, notInArray } from "drizzle-orm";
import { db, PERMISSION_REGISTRY, team, teamPermissions } from "../index.js";

/**
 * When a resource is split or renamed, list the derivation here.
 * Teams that had the old resource will have their permissions copied to the new resources.
 * Applied with ON CONFLICT DO NOTHING — safe to run repeatedly.
 */
const SPLITS: Array<{ from: string; to: string[] }> = [
  { from: "payment_orders", to: ["load_payment_order", "office_expense_payment_order"] },
];

const run = async (): Promise<void> => {
  const teams = await db.select({ id: team.id }).from(team);
  let inserted = 0;

  for (const t of teams) {
    // 1. Ensure every resource/action row exists for this team (default: false).
    for (const [resource, def] of Object.entries(PERMISSION_REGISTRY) as [
      string,
      { actions: readonly string[]; transitions?: readonly string[] },
    ][]) {
      const allActions = [
        ...def.actions,
        ...(def.transitions?.map((s) => `transition:${s}`) ?? []),
      ];
      for (const action of allActions) {
        await db
          .insert(teamPermissions)
          .values({ teamId: t.id, resource, action, allowed: false })
          .onConflictDoNothing();
        inserted++;
      }
    }

    // 2. Apply split derivations: copy allowed=true rows from old resource to new resources.
    for (const split of SPLITS) {
      const oldPerms = await db
        .select({ action: teamPermissions.action, allowed: teamPermissions.allowed })
        .from(teamPermissions)
        .where(and(eq(teamPermissions.teamId, t.id), eq(teamPermissions.resource, split.from)));

      for (const perm of oldPerms) {
        if (!perm.allowed) continue;
        for (const newResource of split.to) {
          await db
            .insert(teamPermissions)
            .values({ teamId: t.id, resource: newResource, action: perm.action, allowed: true })
            .onConflictDoNothing();
          inserted++;
        }
      }
    }
  }

  // 3. Remove rows for resources no longer in the registry.
  const knownResources = Object.keys(PERMISSION_REGISTRY);
  await db.delete(teamPermissions).where(notInArray(teamPermissions.resource, knownResources));

  process.stdout.write(
    `Seeded permissions: ${inserted} new rows, stale resources removed, across ${teams.length} team(s)\n`,
  );
};

run().catch((err) => {
  process.stdout.write(`Failed: ${String(err)}\n`);
  process.exit(1);
});

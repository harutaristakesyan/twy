import { db, team, teamPermissions } from "../index.js";

const NEW_RESOURCES = ["payment_orders", "external_billing", "internal_billing"] as const;
const ACTIONS = ["add", "view", "edit"] as const;

const run = async (): Promise<void> => {
  const teams = await db.select({ id: team.id }).from(team);

  let inserted = 0;

  for (const t of teams) {
    for (const resource of NEW_RESOURCES) {
      for (const action of ACTIONS) {
        await db
          .insert(teamPermissions)
          .values({ teamId: t.id, resource, action, allowed: false })
          .onConflictDoNothing();
        inserted++;
      }
    }
  }

  process.stdout.write(
    `Seeded accounting permissions: ${inserted} rows across ${teams.length} team(s)\n`,
  );
};

run().catch((err) => {
  process.stdout.write(`Failed: ${String(err)}\n`);
  process.exit(1);
});

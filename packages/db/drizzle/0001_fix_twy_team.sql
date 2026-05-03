-- Fix the seeded super-admin team: previous UUID was not a valid v1-8 UUID and
-- was rejected by Zod's z.uuid() validator on every /teams/{teamId}/* endpoint.
-- Also reseed permissions to match the current RESOURCES taxonomy
-- (carriers_twy, carriers_outside, carriers_requests instead of plain "carriers").

UPDATE "team"
SET "name" = 'TWY (legacy)'
WHERE "id" = '00000000-0000-0000-0000-000000000001'
  AND "name" = 'TWY';
--> statement-breakpoint

INSERT INTO "team" ("id", "name", "description", "branch_restricted", "only_own_data")
VALUES (
  '00000000-0000-8000-8000-000000000001',
  'TWY',
  'Super admin team — full access to everything',
  false,
  false
)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint

UPDATE "users"
SET "team_id" = '00000000-0000-8000-8000-000000000001', "updated_at" = now()
WHERE "team_id" = '00000000-0000-0000-0000-000000000001';
--> statement-breakpoint

DELETE FROM "team" WHERE "id" = '00000000-0000-0000-0000-000000000001';
--> statement-breakpoint

DELETE FROM "team_permissions"
WHERE "team_id" = '00000000-0000-8000-8000-000000000001'
  AND "resource" NOT IN (
    'branches', 'brokers', 'brokers_requests',
    'carriers_twy', 'carriers_outside', 'carriers_requests',
    'teams', 'users', 'loads'
  );
--> statement-breakpoint

INSERT INTO "team_permissions" ("team_id", "resource", "action", "allowed")
VALUES
  ('00000000-0000-8000-8000-000000000001', 'branches',          'add',  true),
  ('00000000-0000-8000-8000-000000000001', 'branches',          'view', true),
  ('00000000-0000-8000-8000-000000000001', 'branches',          'edit', true),
  ('00000000-0000-8000-8000-000000000001', 'brokers',           'add',  true),
  ('00000000-0000-8000-8000-000000000001', 'brokers',           'view', true),
  ('00000000-0000-8000-8000-000000000001', 'brokers',           'edit', true),
  ('00000000-0000-8000-8000-000000000001', 'brokers_requests',  'add',  true),
  ('00000000-0000-8000-8000-000000000001', 'brokers_requests',  'view', true),
  ('00000000-0000-8000-8000-000000000001', 'brokers_requests',  'edit', true),
  ('00000000-0000-8000-8000-000000000001', 'carriers_twy',      'add',  true),
  ('00000000-0000-8000-8000-000000000001', 'carriers_twy',      'view', true),
  ('00000000-0000-8000-8000-000000000001', 'carriers_twy',      'edit', true),
  ('00000000-0000-8000-8000-000000000001', 'carriers_outside',  'add',  true),
  ('00000000-0000-8000-8000-000000000001', 'carriers_outside',  'view', true),
  ('00000000-0000-8000-8000-000000000001', 'carriers_outside',  'edit', true),
  ('00000000-0000-8000-8000-000000000001', 'carriers_requests', 'add',  true),
  ('00000000-0000-8000-8000-000000000001', 'carriers_requests', 'view', true),
  ('00000000-0000-8000-8000-000000000001', 'carriers_requests', 'edit', true),
  ('00000000-0000-8000-8000-000000000001', 'teams',             'add',  true),
  ('00000000-0000-8000-8000-000000000001', 'teams',             'view', true),
  ('00000000-0000-8000-8000-000000000001', 'teams',             'edit', true),
  ('00000000-0000-8000-8000-000000000001', 'users',             'add',  true),
  ('00000000-0000-8000-8000-000000000001', 'users',             'view', true),
  ('00000000-0000-8000-8000-000000000001', 'users',             'edit', true),
  ('00000000-0000-8000-8000-000000000001', 'loads',             'add',  true),
  ('00000000-0000-8000-8000-000000000001', 'loads',             'view', true),
  ('00000000-0000-8000-8000-000000000001', 'loads',             'edit', true)
ON CONFLICT ("team_id", "resource", "action") DO UPDATE SET "allowed" = EXCLUDED."allowed";

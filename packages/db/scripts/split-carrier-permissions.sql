-- One-time data migration: split single 'carriers' permission into three sub-resources.
-- Run via: pnpm sst shell --stage <yours> -- npx tsx packages/db/scripts/run-sql.ts split-carrier-permissions.sql
-- Or paste directly into a DB console connected to the cluster.

-- Drop the single 'carriers' rows for every team.
DELETE FROM team_permissions WHERE resource = 'carriers';

-- Insert (false, false, false) rows for the three new resources for every existing team.
INSERT INTO team_permissions (team_id, resource, action, allowed)
SELECT t.id, r.resource, a.action, false
FROM team t
CROSS JOIN (VALUES ('carriers_twy'), ('carriers_outside'), ('carriers_requests')) AS r(resource)
CROSS JOIN (VALUES ('add'), ('view'), ('edit')) AS a(action)
ON CONFLICT DO NOTHING;

-- Re-grant all three resources to the TWY system team so admins retain access.
UPDATE team_permissions
SET allowed = true
WHERE team_id = '00000000-0000-0000-0000-000000000001'
  AND resource IN ('carriers_twy', 'carriers_outside', 'carriers_requests');

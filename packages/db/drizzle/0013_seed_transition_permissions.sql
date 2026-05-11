-- Custom SQL migration file, put your code below! --

-- Backfill: teams with loads:edit get loads:transition:<Status> for all load statuses
INSERT INTO team_permissions (team_id, resource, action, allowed)
SELECT tp.team_id, 'loads', concat('transition:', s.status), true
FROM team_permissions tp
CROSS JOIN (
  VALUES ('Pending'), ('Approved'), ('Hold'), ('Declined'), ('Delivered')
) AS s(status)
WHERE tp.resource = 'loads' AND tp.action = 'edit' AND tp.allowed = true
ON CONFLICT (team_id, resource, action) DO NOTHING;
--> statement-breakpoint
-- Backfill: teams with payment_orders:edit get payment_orders:transition:<Status>
INSERT INTO team_permissions (team_id, resource, action, allowed)
SELECT tp.team_id, 'payment_orders', concat('transition:', s.status), true
FROM team_permissions tp
CROSS JOIN (
  VALUES ('Pending'), ('Approved'), ('Paid'), ('PartialPaid'), ('Hold'), ('Declined'), ('ReadyForInvoice')
) AS s(status)
WHERE tp.resource = 'payment_orders' AND tp.action = 'edit' AND tp.allowed = true
ON CONFLICT (team_id, resource, action) DO NOTHING;
--> statement-breakpoint
-- Backfill: teams with X:edit get X:delete (edit previously implied delete in some handlers)
-- Only for entities where delete was an implied permission
INSERT INTO team_permissions (team_id, resource, action, allowed)
SELECT DISTINCT tp.team_id, tp.resource, 'delete', true
FROM team_permissions tp
WHERE tp.action = 'edit' AND tp.allowed = true
  AND tp.resource IN ('loads', 'payment_orders', 'brokers', 'carriers_twy', 'carriers_outside', 'teams', 'users', 'branches')
ON CONFLICT (team_id, resource, action) DO NOTHING;

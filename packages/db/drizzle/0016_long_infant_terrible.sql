ALTER TABLE "permission_audit" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "permission_audit" CASCADE;--> statement-breakpoint
ALTER TABLE "payment_order" ALTER COLUMN "income_percentage" SET DATA TYPE numeric(8, 2);
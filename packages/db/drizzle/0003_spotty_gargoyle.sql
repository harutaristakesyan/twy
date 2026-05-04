ALTER TABLE "broker_request" DROP CONSTRAINT "broker_request_branch_id_branch_id_fk";
--> statement-breakpoint
ALTER TABLE "outside_broker" DROP CONSTRAINT "outside_broker_branch_id_branch_id_fk";
--> statement-breakpoint
ALTER TABLE "broker_request" DROP COLUMN "branch_id";--> statement-breakpoint
ALTER TABLE "outside_broker" DROP COLUMN "branch_id";
CREATE TABLE "broker_request" (
	"id" uuid PRIMARY KEY NOT NULL,
	"broker_name" text NOT NULL,
	"mc_number" text NOT NULL,
	"contact_name" text,
	"phone" text,
	"email" text,
	"address" text,
	"notes" text,
	"branch_id" uuid,
	"credit_limit_unlimited" boolean DEFAULT true NOT NULL,
	"credit_limit" numeric(10, 2),
	"status" text DEFAULT 'pending' NOT NULL,
	"submitted_by" uuid,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"result_broker_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "broker_request" ADD CONSTRAINT "broker_request_branch_id_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branch"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broker_request" ADD CONSTRAINT "broker_request_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broker_request" ADD CONSTRAINT "broker_request_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broker_request" ADD CONSTRAINT "broker_request_result_broker_id_outside_broker_id_fk" FOREIGN KEY ("result_broker_id") REFERENCES "public"."outside_broker"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
INSERT INTO "broker_request" (
	"id",
	"broker_name",
	"mc_number",
	"contact_name",
	"phone",
	"email",
	"address",
	"notes",
	"branch_id",
	"credit_limit_unlimited",
	"credit_limit",
	"status",
	"submitted_by",
	"reviewed_by",
	"reviewed_at",
	"rejection_reason",
	"result_broker_id",
	"created_at",
	"updated_at"
)
SELECT
	gen_random_uuid(),
	"broker_name",
	"mc_number",
	"contact_name",
	"phone",
	"email",
	"address",
	"notes",
	"branch_id",
	"credit_limit_unlimited",
	"credit_limit",
	'pending',
	"created_by",
	NULL,
	NULL,
	NULL,
	NULL,
	"created_at",
	"updated_at"
FROM "outside_broker"
WHERE "status" = 'pending';
--> statement-breakpoint
DELETE FROM "outside_broker" WHERE "status" = 'pending';
--> statement-breakpoint
INSERT INTO "team_permissions" ("team_id", "resource", "action", "allowed")
SELECT tp."team_id", 'brokers_requests', tp."action", tp."allowed"
FROM "team_permissions" tp
WHERE tp."resource" = 'brokers'
	AND NOT EXISTS (
		SELECT 1
		FROM "team_permissions" x
		WHERE x."team_id" = tp."team_id"
			AND x."resource" = 'brokers_requests'
			AND x."action" = tp."action"
	);

CREATE TABLE "outside_broker" (
	"id" uuid PRIMARY KEY NOT NULL,
	"broker_name" text NOT NULL,
	"mc_number" text NOT NULL,
	"contact_name" text,
	"phone" text,
	"email" text,
	"address" text,
	"notes" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"branch_id" uuid,
	"credit_limit_unlimited" boolean DEFAULT true NOT NULL,
	"credit_limit" numeric(10, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outside_broker_mcNumber_unique" UNIQUE("mc_number")
);
--> statement-breakpoint
ALTER TABLE "outside_broker" ADD CONSTRAINT "outside_broker_branch_id_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branch"("id") ON DELETE set null ON UPDATE no action;
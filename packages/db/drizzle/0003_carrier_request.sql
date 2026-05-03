CREATE TABLE IF NOT EXISTS "carrier" (
	"id" uuid PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"carrier_name" text NOT NULL,
	"mc_dot_number" text NOT NULL,
	"equipment_type" text,
	"insurance_status" text DEFAULT 'pending' NOT NULL,
	"insurance_expiry" timestamp with time zone,
	"phone" text,
	"email" text,
	"notes" text,
	"status" text DEFAULT 'approved' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "carrier_mcDotNumber_unique" UNIQUE("mc_dot_number")
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "carrier" ADD CONSTRAINT "carrier_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "carrier_request" (
	"id" uuid PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"carrier_name" text NOT NULL,
	"mc_dot_number" text NOT NULL,
	"equipment_type" text,
	"insurance_status" text DEFAULT 'pending' NOT NULL,
	"insurance_expiry" timestamp with time zone,
	"phone" text,
	"email" text,
	"notes" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"submitted_by" uuid,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"result_carrier_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "carrier_request" ADD CONSTRAINT "carrier_request_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "carrier_request" ADD CONSTRAINT "carrier_request_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "carrier_request" ADD CONSTRAINT "carrier_request_result_carrier_id_carrier_id_fk" FOREIGN KEY ("result_carrier_id") REFERENCES "public"."carrier"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

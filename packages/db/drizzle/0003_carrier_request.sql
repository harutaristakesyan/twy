CREATE TABLE "carrier_request" (
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
ALTER TABLE "carrier_request" ADD CONSTRAINT "carrier_request_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carrier_request" ADD CONSTRAINT "carrier_request_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carrier_request" ADD CONSTRAINT "carrier_request_result_carrier_id_carrier_id_fk" FOREIGN KEY ("result_carrier_id") REFERENCES "public"."carrier"("id") ON DELETE set null ON UPDATE no action;

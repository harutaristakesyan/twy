CREATE TABLE "branch" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contact" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branch_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "file" (
	"id" uuid PRIMARY KEY NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"branch_restricted" boolean DEFAULT false NOT NULL,
	"only_own_data" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cognito_sub" varchar(64) NOT NULL,
	"email" varchar(255) NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"branch" uuid,
	"team_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_cognito_sub_unique" UNIQUE("cognito_sub")
);
--> statement-breakpoint
CREATE TABLE "load" (
	"id" uuid PRIMARY KEY NOT NULL,
	"customer" text,
	"reference_number" text NOT NULL,
	"customer_rate" numeric(10, 2),
	"contact_name" text NOT NULL,
	"carrier" text,
	"carrier_payment_method" text,
	"carrier_rate" numeric(10, 2) NOT NULL,
	"charge_service_fee_to_office" boolean DEFAULT false,
	"is_chargable" boolean DEFAULT false NOT NULL,
	"charge_amount" numeric(10, 2),
	"load_type" text NOT NULL,
	"service_type" text NOT NULL,
	"service_given_as" text NOT NULL,
	"commodity" text NOT NULL,
	"booked_as" text NOT NULL,
	"sold_as" text NOT NULL,
	"weight" text NOT NULL,
	"temperature" text,
	"pickup_city_zip_code" text,
	"pickup_phone" text,
	"pickup_carrier" text NOT NULL,
	"pickup_name" text NOT NULL,
	"pickup_address" text NOT NULL,
	"dropoff_city_zip_code" text,
	"dropoff_phone" text,
	"dropoff_carrier" text NOT NULL,
	"dropoff_name" text NOT NULL,
	"dropoff_address" text NOT NULL,
	"branch_id" uuid NOT NULL,
	"status" text DEFAULT 'Pending' NOT NULL,
	"status_changed_by" varchar(255),
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "load_files" (
	"load_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	CONSTRAINT "load_files_load_id_file_id_pk" PRIMARY KEY("load_id","file_id")
);
--> statement-breakpoint
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
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outside_broker_mcNumber_unique" UNIQUE("mc_number")
);
--> statement-breakpoint
CREATE TABLE "team_permissions" (
	"team_id" uuid NOT NULL,
	"resource" text NOT NULL,
	"action" text NOT NULL,
	"allowed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "team_permissions_team_id_resource_action_pk" PRIMARY KEY("team_id","resource","action")
);
--> statement-breakpoint
CREATE TABLE "carrier" (
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
ALTER TABLE "users" ADD CONSTRAINT "users_branch_branch_id_fk" FOREIGN KEY ("branch") REFERENCES "public"."branch"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "load" ADD CONSTRAINT "load_branch_id_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branch"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "load" ADD CONSTRAINT "load_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "load_files" ADD CONSTRAINT "load_files_load_id_load_id_fk" FOREIGN KEY ("load_id") REFERENCES "public"."load"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "load_files" ADD CONSTRAINT "load_files_file_id_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."file"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outside_broker" ADD CONSTRAINT "outside_broker_branch_id_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branch"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outside_broker" ADD CONSTRAINT "outside_broker_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_permissions" ADD CONSTRAINT "team_permissions_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carrier" ADD CONSTRAINT "carrier_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carrier_request" ADD CONSTRAINT "carrier_request_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carrier_request" ADD CONSTRAINT "carrier_request_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carrier_request" ADD CONSTRAINT "carrier_request_result_carrier_id_carrier_id_fk" FOREIGN KEY ("result_carrier_id") REFERENCES "public"."carrier"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broker_request" ADD CONSTRAINT "broker_request_branch_id_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branch"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broker_request" ADD CONSTRAINT "broker_request_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broker_request" ADD CONSTRAINT "broker_request_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broker_request" ADD CONSTRAINT "broker_request_result_broker_id_outside_broker_id_fk" FOREIGN KEY ("result_broker_id") REFERENCES "public"."outside_broker"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
INSERT INTO "team" ("id", "name", "description", "branch_restricted", "only_own_data")
VALUES ('00000000-0000-0000-0000-000000000001', 'TWY', 'Super admin team — full access to everything', false, false);
--> statement-breakpoint
INSERT INTO "team_permissions" ("team_id", "resource", "action", "allowed")
VALUES
  ('00000000-0000-0000-0000-000000000001', 'branches',         'add',  true),
  ('00000000-0000-0000-0000-000000000001', 'branches',         'view', true),
  ('00000000-0000-0000-0000-000000000001', 'branches',         'edit', true),
  ('00000000-0000-0000-0000-000000000001', 'brokers',          'add',  true),
  ('00000000-0000-0000-0000-000000000001', 'brokers',          'view', true),
  ('00000000-0000-0000-0000-000000000001', 'brokers',          'edit', true),
  ('00000000-0000-0000-0000-000000000001', 'brokers_requests', 'add',  true),
  ('00000000-0000-0000-0000-000000000001', 'brokers_requests', 'view', true),
  ('00000000-0000-0000-0000-000000000001', 'brokers_requests', 'edit', true),
  ('00000000-0000-0000-0000-000000000001', 'carriers',         'add',  true),
  ('00000000-0000-0000-0000-000000000001', 'carriers',         'view', true),
  ('00000000-0000-0000-0000-000000000001', 'carriers',         'edit', true),
  ('00000000-0000-0000-0000-000000000001', 'teams',            'add',  true),
  ('00000000-0000-0000-0000-000000000001', 'teams',            'view', true),
  ('00000000-0000-0000-0000-000000000001', 'teams',            'edit', true),
  ('00000000-0000-0000-0000-000000000001', 'users',            'add',  true),
  ('00000000-0000-0000-0000-000000000001', 'users',            'view', true),
  ('00000000-0000-0000-0000-000000000001', 'users',            'edit', true),
  ('00000000-0000-0000-0000-000000000001', 'loads',            'add',  true),
  ('00000000-0000-0000-0000-000000000001', 'loads',            'view', true),
  ('00000000-0000-0000-0000-000000000001', 'loads',            'edit', true);

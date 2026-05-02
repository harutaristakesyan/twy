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
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"role" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"branch" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "load" ADD CONSTRAINT "load_branch_id_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branch"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "load_files" ADD CONSTRAINT "load_files_load_id_load_id_fk" FOREIGN KEY ("load_id") REFERENCES "public"."load"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "load_files" ADD CONSTRAINT "load_files_file_id_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."file"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_branch_branch_id_fk" FOREIGN KEY ("branch") REFERENCES "public"."branch"("id") ON DELETE set null ON UPDATE no action;
CREATE TABLE "invoice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"load_id" uuid NOT NULL,
	"type" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"due_at" timestamp NOT NULL,
	"payment_term_days" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"file_id" uuid,
	"last_reminder_sent_at" timestamp,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_loadId_type_unique" UNIQUE("load_id","type")
);
--> statement-breakpoint
CREATE TABLE "load_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"load_id" uuid NOT NULL,
	"actor_id" uuid,
	"event" text NOT NULL,
	"payload" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"paid_at" timestamp DEFAULT now() NOT NULL,
	"method" text,
	"reference" text,
	"status" text DEFAULT 'completed' NOT NULL,
	"recorded_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "file" ADD COLUMN "document_category" text;--> statement-breakpoint
ALTER TABLE "load" ADD COLUMN "carrier_id" uuid;--> statement-breakpoint
ALTER TABLE "load" ADD COLUMN "service_fee" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "load" ADD COLUMN "income_percentage" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "load" ADD COLUMN "charges" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "load" ADD COLUMN "financials_locked_at" timestamp;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_load_id_load_id_fk" FOREIGN KEY ("load_id") REFERENCES "public"."load"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_file_id_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."file"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "load_audit_log" ADD CONSTRAINT "load_audit_log_load_id_load_id_fk" FOREIGN KEY ("load_id") REFERENCES "public"."load"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "load_audit_log" ADD CONSTRAINT "load_audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_invoice_id_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "load" ADD CONSTRAINT "load_carrier_id_carrier_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."carrier"("id") ON DELETE restrict ON UPDATE no action;
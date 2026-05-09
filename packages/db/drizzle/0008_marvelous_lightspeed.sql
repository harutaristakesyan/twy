CREATE TABLE "payment_order" (
	"id" uuid PRIMARY KEY NOT NULL,
	"load_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"carrier_id" uuid,
	"broker_receivable" numeric(10, 2),
	"carrier_payable" numeric(10, 2) NOT NULL,
	"service_fee" numeric(10, 2) DEFAULT '30.00' NOT NULL,
	"income_percentage" numeric(5, 2),
	"charges" numeric(10, 2),
	"profit" numeric(10, 2),
	"payment_status" text DEFAULT 'Pending' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_order_load_id_unique" UNIQUE("load_id")
);
--> statement-breakpoint
ALTER TABLE "invoice" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "load_audit_log" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "payment" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "invoice" CASCADE;--> statement-breakpoint
DROP TABLE "load_audit_log" CASCADE;--> statement-breakpoint
DROP TABLE "payment" CASCADE;--> statement-breakpoint
ALTER TABLE "load" ALTER COLUMN "service_fee" SET DEFAULT '30.00';--> statement-breakpoint
ALTER TABLE "payment_order" ADD CONSTRAINT "payment_order_load_id_load_id_fk" FOREIGN KEY ("load_id") REFERENCES "public"."load"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_order" ADD CONSTRAINT "payment_order_branch_id_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branch"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_order" ADD CONSTRAINT "payment_order_carrier_id_carrier_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."carrier"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_order" ADD CONSTRAINT "payment_order_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "load" DROP COLUMN "income_percentage";--> statement-breakpoint
ALTER TABLE "load" DROP COLUMN "charges";--> statement-breakpoint
ALTER TABLE "load" ADD CONSTRAINT "load_referenceNumber_unique" UNIQUE("reference_number");
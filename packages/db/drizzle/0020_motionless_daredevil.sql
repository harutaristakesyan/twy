CREATE TABLE "load_ref_seq" (
	"year" integer PRIMARY KEY NOT NULL,
	"last_value" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "carrier" ADD COLUMN "payment_method" text;--> statement-breakpoint
ALTER TABLE "carrier" ADD COLUMN "payment_terms" text;--> statement-breakpoint
TRUNCATE TABLE "load", "load_files", "load_stop", "load_comment", "payment_order", "payment_order_files" CASCADE;--> statement-breakpoint
ALTER TABLE "load" ADD COLUMN "broker_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "outside_broker" ADD COLUMN "payment_method" text;--> statement-breakpoint
ALTER TABLE "outside_broker" ADD COLUMN "payment_terms" text;--> statement-breakpoint
ALTER TABLE "load" ADD CONSTRAINT "load_broker_id_outside_broker_id_fk" FOREIGN KEY ("broker_id") REFERENCES "public"."outside_broker"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "load" DROP COLUMN "customer";--> statement-breakpoint
ALTER TABLE "load" DROP COLUMN "contact_name";--> statement-breakpoint
ALTER TABLE "load" DROP COLUMN "payment_method";--> statement-breakpoint
ALTER TABLE "load" DROP COLUMN "payment_terms";--> statement-breakpoint
ALTER TABLE "load" DROP COLUMN "carrier";--> statement-breakpoint
ALTER TABLE "load" DROP COLUMN "carrier_payment_method";

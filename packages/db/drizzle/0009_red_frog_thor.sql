CREATE TABLE "payment_order_files" (
	"payment_order_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	CONSTRAINT "payment_order_files_payment_order_id_file_id_pk" PRIMARY KEY("payment_order_id","file_id")
);
--> statement-breakpoint
ALTER TABLE "payment_order" ADD COLUMN "carrier_paid_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "payment_order" ADD COLUMN "carrier_paid_date" date;--> statement-breakpoint
ALTER TABLE "payment_order" ADD COLUMN "broker_received_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "payment_order" ADD COLUMN "broker_received_date" date;--> statement-breakpoint
ALTER TABLE "payment_order_files" ADD CONSTRAINT "payment_order_files_payment_order_id_payment_order_id_fk" FOREIGN KEY ("payment_order_id") REFERENCES "public"."payment_order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_order_files" ADD CONSTRAINT "payment_order_files_file_id_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."file"("id") ON DELETE restrict ON UPDATE no action;
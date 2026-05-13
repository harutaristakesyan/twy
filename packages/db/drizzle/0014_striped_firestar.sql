CREATE TABLE "office_expense_payment_order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_name" text NOT NULL,
	"payment_purpose" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"payment_status" text DEFAULT 'Pending' NOT NULL,
	"payment_made_on" date,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "amount_positive" CHECK ("office_expense_payment_order"."amount" > 0),
	CONSTRAINT "period_valid" CHECK ("office_expense_payment_order"."period_end" >= "office_expense_payment_order"."period_start")
);
--> statement-breakpoint
CREATE TABLE "office_expense_payment_order_files" (
	"office_expense_payment_order_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	CONSTRAINT "office_expense_payment_order_files_office_expense_payment_order_id_file_id_pk" PRIMARY KEY("office_expense_payment_order_id","file_id")
);
--> statement-breakpoint
ALTER TABLE "office_expense_payment_order" ADD CONSTRAINT "office_expense_payment_order_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "office_expense_payment_order_files" ADD CONSTRAINT "office_expense_payment_order_files_office_expense_payment_order_id_office_expense_payment_order_id_fk" FOREIGN KEY ("office_expense_payment_order_id") REFERENCES "public"."office_expense_payment_order"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "office_expense_payment_order_files" ADD CONSTRAINT "office_expense_payment_order_files_file_id_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."file"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "office_expense_payment_order_files" DROP CONSTRAINT "oepo_files_order_fk";
--> statement-breakpoint
ALTER TABLE "file" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "file" ADD CONSTRAINT "file_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "office_expense_payment_order_files" ADD CONSTRAINT "oepo_files_order_fk" FOREIGN KEY ("office_expense_payment_order_id") REFERENCES "public"."office_expense_payment_order"("id") ON DELETE cascade ON UPDATE no action;
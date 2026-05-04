ALTER TABLE "users" DROP CONSTRAINT "users_cognito_sub_unique";--> statement-breakpoint
ALTER TABLE "branch" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
ALTER TABLE "branch" ADD CONSTRAINT "branch_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_cognitoSub_unique" UNIQUE("cognito_sub");
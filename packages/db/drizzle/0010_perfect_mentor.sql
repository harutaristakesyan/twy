CREATE TABLE "load_comment" (
	"id" uuid PRIMARY KEY NOT NULL,
	"load_id" uuid NOT NULL,
	"user_id" uuid,
	"comment_type" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "load_comment" ADD CONSTRAINT "load_comment_load_id_load_id_fk" FOREIGN KEY ("load_id") REFERENCES "public"."load"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "load_comment" ADD CONSTRAINT "load_comment_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
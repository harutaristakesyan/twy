CREATE TABLE "community_licenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ci_number" text NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "community_licenses_ciNumber_unique" UNIQUE("ci_number")
);
--> statement-breakpoint
ALTER TABLE "branch" ADD COLUMN "ci_id" uuid;--> statement-breakpoint
ALTER TABLE "community_licenses" ADD CONSTRAINT "community_licenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch" ADD CONSTRAINT "branch_ci_id_community_licenses_id_fk" FOREIGN KEY ("ci_id") REFERENCES "public"."community_licenses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "branch_ci_id_idx" ON "branch" USING btree ("ci_id");
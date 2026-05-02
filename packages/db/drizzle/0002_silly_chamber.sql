CREATE TABLE "team" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"branch_restricted" boolean DEFAULT false NOT NULL,
	"only_own_data" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "team_permissions" (
	"team_id" uuid NOT NULL,
	"resource" text NOT NULL,
	"action" text NOT NULL,
	"allowed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "team_permissions_team_id_resource_action_pk" PRIMARY KEY("team_id","resource","action")
);
--> statement-breakpoint
ALTER TABLE "load" ADD COLUMN "created_by" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "outside_broker" ADD COLUMN "created_by" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "team_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "created_by" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "team_permissions" ADD CONSTRAINT "team_permissions_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "load" ADD CONSTRAINT "load_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outside_broker" ADD CONSTRAINT "outside_broker_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "role";
--> statement-breakpoint
INSERT INTO "team" ("id", "name", "description", "branch_restricted", "only_own_data")
VALUES ('00000000-0000-0000-0000-000000000001', 'TWY', 'Super admin team — full access to everything', false, false)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "team_permissions" ("team_id", "resource", "action", "allowed")
VALUES
  ('00000000-0000-0000-0000-000000000001', 'branches', 'add',  true),
  ('00000000-0000-0000-0000-000000000001', 'branches', 'view', true),
  ('00000000-0000-0000-0000-000000000001', 'branches', 'edit', true),
  ('00000000-0000-0000-0000-000000000001', 'brokers',  'add',  true),
  ('00000000-0000-0000-0000-000000000001', 'brokers',  'view', true),
  ('00000000-0000-0000-0000-000000000001', 'brokers',  'edit', true),
  ('00000000-0000-0000-0000-000000000001', 'carriers', 'add',  true),
  ('00000000-0000-0000-0000-000000000001', 'carriers', 'view', true),
  ('00000000-0000-0000-0000-000000000001', 'carriers', 'edit', true),
  ('00000000-0000-0000-0000-000000000001', 'teams',    'add',  true),
  ('00000000-0000-0000-0000-000000000001', 'teams',    'view', true),
  ('00000000-0000-0000-0000-000000000001', 'teams',    'edit', true),
  ('00000000-0000-0000-0000-000000000001', 'users',    'add',  true),
  ('00000000-0000-0000-0000-000000000001', 'users',    'view', true),
  ('00000000-0000-0000-0000-000000000001', 'users',    'edit', true),
  ('00000000-0000-0000-0000-000000000001', 'loads',    'add',  true),
  ('00000000-0000-0000-0000-000000000001', 'loads',    'view', true),
  ('00000000-0000-0000-0000-000000000001', 'loads',    'edit', true)
ON CONFLICT ("team_id", "resource", "action") DO NOTHING;

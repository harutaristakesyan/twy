ALTER TABLE "load_stop" ADD COLUMN "latitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "load_stop" ADD COLUMN "longitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "load_stop" ADD COLUMN "place_id" text;
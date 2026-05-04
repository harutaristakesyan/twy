-- Phase 2 migration: drops legacy pickup/dropoff columns from load. Apply only after all app instances read/write load_stop (post-0005 deploy). Rolling back to pre-load_stop code after this runs will break.
ALTER TABLE "load" DROP COLUMN "pickup_city_zip_code";--> statement-breakpoint
ALTER TABLE "load" DROP COLUMN "pickup_phone";--> statement-breakpoint
ALTER TABLE "load" DROP COLUMN "pickup_carrier";--> statement-breakpoint
ALTER TABLE "load" DROP COLUMN "pickup_name";--> statement-breakpoint
ALTER TABLE "load" DROP COLUMN "pickup_address";--> statement-breakpoint
ALTER TABLE "load" DROP COLUMN "dropoff_city_zip_code";--> statement-breakpoint
ALTER TABLE "load" DROP COLUMN "dropoff_phone";--> statement-breakpoint
ALTER TABLE "load" DROP COLUMN "dropoff_carrier";--> statement-breakpoint
ALTER TABLE "load" DROP COLUMN "dropoff_name";--> statement-breakpoint
ALTER TABLE "load" DROP COLUMN "dropoff_address";
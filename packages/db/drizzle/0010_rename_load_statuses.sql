UPDATE "load" SET "status" = 'Declined' WHERE "status" = 'Denied';
--> statement-breakpoint
UPDATE "load" SET "status" = 'Delivered' WHERE "status" = 'ApprovedPaid';

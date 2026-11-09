DELETE FROM "saved_company";--> statement-breakpoint
ALTER TABLE "saved_company" ALTER COLUMN "address" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "saved_company" ADD COLUMN "comune" text NOT NULL;--> statement-breakpoint
ALTER TABLE "saved_company" ADD COLUMN "province" text;
CREATE TABLE "saved_company" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"address" text,
	"phone" text,
	"website" text,
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL,
	"notes" text,
	"extra" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_company_list_external_key" UNIQUE("list_id","external_id")
);
--> statement-breakpoint
CREATE TABLE "saved_job_offer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"title" text NOT NULL,
	"company_name" text NOT NULL,
	"location" text NOT NULL,
	"via" text NOT NULL,
	"description" text NOT NULL,
	"apply_link" text NOT NULL,
	"notes" text,
	"extra" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_job_offer_list_external_key" UNIQUE("list_id","external_id")
);
--> statement-breakpoint
CREATE TABLE "saved_list" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"columns" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_list_user_kind_name_key" UNIQUE("user_id","kind","name")
);
--> statement-breakpoint
DROP TABLE "example" CASCADE;--> statement-breakpoint
ALTER TABLE "saved_company" ADD CONSTRAINT "saved_company_list_id_saved_list_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."saved_list"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_job_offer" ADD CONSTRAINT "saved_job_offer_list_id_saved_list_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."saved_list"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_list" ADD CONSTRAINT "saved_list_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "saved_company_list_idx" ON "saved_company" USING btree ("list_id");--> statement-breakpoint
CREATE INDEX "saved_job_offer_list_idx" ON "saved_job_offer" USING btree ("list_id");--> statement-breakpoint
CREATE INDEX "saved_list_user_idx" ON "saved_list" USING btree ("user_id");
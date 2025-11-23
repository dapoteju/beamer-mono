CREATE TYPE "public"."org_type" AS ENUM('advertiser', 'publisher', 'beamer_internal');--> statement-breakpoint
CREATE TYPE "public"."screen_status" AS ENUM('active', 'inactive', 'maintenance');--> statement-breakpoint
CREATE TABLE "organisations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "org_type" NOT NULL,
	"billing_email" varchar(255) NOT NULL,
	"country" varchar(2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "screens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"publisher_org_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"screen_type" varchar(50) NOT NULL,
	"resolution_width" integer NOT NULL,
	"resolution_height" integer NOT NULL,
	"city" varchar(100) NOT NULL,
	"region_code" varchar(10) NOT NULL,
	"lat" varchar(50) NOT NULL,
	"lng" varchar(50) NOT NULL,
	"status" "screen_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "screens" ADD CONSTRAINT "screens_publisher_org_id_organisations_id_fk" FOREIGN KEY ("publisher_org_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
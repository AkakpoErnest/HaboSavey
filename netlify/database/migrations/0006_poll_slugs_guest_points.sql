CREATE TABLE "guest_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"voter_key" text NOT NULL,
	"amount" integer NOT NULL,
	"reason" "points_reason" NOT NULL,
	"ref_id" text NOT NULL,
	"claimed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "polls" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "polls" ADD COLUMN "featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "guest_points" ADD CONSTRAINT "guest_points_claimed_by_users_id_fk" FOREIGN KEY ("claimed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "guest_points_once" ON "guest_points" USING btree ("voter_key","reason","ref_id");--> statement-breakpoint
ALTER TABLE "polls" ADD CONSTRAINT "polls_slug_unique" UNIQUE("slug");--> statement-breakpoint
UPDATE "polls" SET "slug" = 'promenade', "featured" = true WHERE "id" = '00000000-0000-4000-c000-000000000001' AND "slug" IS NULL;--> statement-breakpoint
UPDATE "polls" SET "slug" = 'poll-' || left("id"::text, 8) WHERE "slug" IS NULL;

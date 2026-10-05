CREATE TYPE "public"."poll_choice" AS ENUM('a', 'b');--> statement-breakpoint
CREATE TYPE "public"."poll_status" AS ENUM('draft', 'open', 'closed');--> statement-breakpoint
ALTER TYPE "public"."qr_target" ADD VALUE 'poll';--> statement-breakpoint
CREATE TABLE "poll_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poll_id" uuid NOT NULL,
	"choice" "poll_choice" NOT NULL,
	"voter_key" text NOT NULL,
	"user_id" uuid,
	"ip_hash" text,
	"qr_code_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "polls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title_ja" text NOT NULL,
	"title_en" text,
	"question_ja" text NOT NULL,
	"question_en" text,
	"description_ja" text DEFAULT '' NOT NULL,
	"description_en" text,
	"option_a_image_path" text NOT NULL,
	"option_a_label_ja" text NOT NULL,
	"option_a_label_en" text,
	"option_b_image_path" text NOT NULL,
	"option_b_label_ja" text NOT NULL,
	"option_b_label_en" text,
	"place_id" uuid,
	"status" "poll_status" DEFAULT 'draft' NOT NULL,
	"opens_at" timestamp with time zone,
	"closes_at" timestamp with time zone,
	"results_visibility" "results_visibility" DEFAULT 'after_vote' NOT NULL,
	"require_sign_in" boolean DEFAULT false NOT NULL,
	"verified_only" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_qr_code_id_qr_codes_id_fk" FOREIGN KEY ("qr_code_id") REFERENCES "public"."qr_codes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polls" ADD CONSTRAINT "polls_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polls" ADD CONSTRAINT "polls_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "poll_votes_one_per_voter" ON "poll_votes" USING btree ("poll_id","voter_key");--> statement-breakpoint
CREATE INDEX "poll_votes_ip_idx" ON "poll_votes" USING btree ("poll_id","ip_hash");
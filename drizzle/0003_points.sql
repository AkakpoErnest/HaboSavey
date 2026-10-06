CREATE TYPE "public"."points_reason" AS ENUM('poll_vote', 'survey_response', 'proposal_approved', 'qr_checkin', 'game_deposit', 'game_reward', 'admin_adjust');--> statement-breakpoint
CREATE TABLE "points_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"reason" "points_reason" NOT NULL,
	"ref_id" text NOT NULL,
	"onchain_tx" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "points_ledger_once" ON "points_ledger" USING btree ("user_id","reason","ref_id");--> statement-breakpoint
CREATE INDEX "points_ledger_user_idx" ON "points_ledger" USING btree ("user_id","created_at");
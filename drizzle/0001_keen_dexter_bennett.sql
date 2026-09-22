ALTER TABLE "gardens" ADD COLUMN "total_points_earned" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
-- Backfill existing rows to their current balance rather than leaving them at
-- the column default of 0 — same approximation the local AsyncStorage
-- migration uses (no way to recover true lifetime earnings from history,
-- but the current balance is a reasonable floor and never overcounts).
UPDATE "gardens" SET "total_points_earned" = "points" WHERE "total_points_earned" = 0;
CREATE TABLE "gardens" (
	"user_id" text PRIMARY KEY NOT NULL,
	"points" integer NOT NULL,
	"tiles" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

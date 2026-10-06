// DATABASE SCHEMA — this is Drizzle's way of describing our Postgres
// tables in TypeScript instead of raw SQL. Each `pgTable(...)` call both (a)
// describes a real table that exists in the Neon database (see the
// migration files that actually created it) and (b) gives the rest of the
// code a typed object (`gardens`, used in src/app/api/garden+api.ts) to
// query and insert through — so a typo in a column name is a compile-time
// error here instead of a runtime SQL failure.
import { integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import type { TileState } from '@/lib/garden-domain';

export const gardens = pgTable('gardens', {
  // One row per signed-in user, keyed by their Clerk user id — hence
  // `primaryKey()`, which also means Postgres enforces there's never more
  // than one garden row per account.
  userId: text('user_id').primaryKey(),
  points: integer('points').notNull(),
  // Lifetime points ever earned (never decreases when spent) — drives the
  // catalog-unlock progression hook, see CatalogItem.unlockThreshold in
  // garden-domain.ts. Existing rows get this backfilled to their current
  // `points` on migration (see the accompanying UPDATE statement) — same
  // approximation as the local AsyncStorage migration, for the same reason
  // (no way to recover true historical earnings).
  totalPointsEarned: integer('total_points_earned').notNull().default(0),
  // `jsonb(...)` stores the entire tiles array as one JSON blob column
  // rather than a separate SQL row per tile — simplest match for data that's
  // always read and written as a whole garden anyway. `.$type<TileState[]>()`
  // is Drizzle-specific: Postgres itself doesn't know or enforce this shape
  // (jsonb is just untyped JSON to the database), but it tells TypeScript to
  // treat whatever comes back from this column as `TileState[]`, matching
  // the exact same type the app's own domain logic uses.
  tiles: jsonb('tiles').$type<TileState[]>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

import { integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import type { TileState } from '@/lib/garden-domain';

export const gardens = pgTable('gardens', {
  userId: text('user_id').primaryKey(),
  points: integer('points').notNull(),
  // Lifetime points ever earned (never decreases when spent) — drives the
  // catalog-unlock progression hook, see CatalogItem.unlockThreshold in
  // garden-domain.ts. Existing rows get this backfilled to their current
  // `points` on migration (see the accompanying UPDATE statement) — same
  // approximation as the local AsyncStorage migration, for the same reason
  // (no way to recover true historical earnings).
  totalPointsEarned: integer('total_points_earned').notNull().default(0),
  tiles: jsonb('tiles').$type<TileState[]>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

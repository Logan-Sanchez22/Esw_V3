import { integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import type { TileState } from '@/lib/garden-domain';

export const gardens = pgTable('gardens', {
  userId: text('user_id').primaryKey(),
  points: integer('points').notNull(),
  tiles: jsonb('tiles').$type<TileState[]>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

import { createClerkClient } from '@clerk/backend';
import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { gardens } from '@/db/schema';
import { GRID_SIZE } from '@/lib/garden-domain';
import type { GardenDomainState, TileState } from '@/lib/garden-domain';

// authenticateRequest also needs the publishable key; @clerk/backend only
// looks for a bare CLERK_PUBLISHABLE_KEY env var by default, which we don't
// set (ours is EXPO_PUBLIC_-prefixed for client bundling), so pass it explicitly.
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
});

async function requireUserId(request: Request): Promise<string | Response> {
  const requestState = await clerkClient.authenticateRequest(request);
  if (!requestState.isAuthenticated) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return requestState.toAuth().userId;
}

function isValidGardenState(value: unknown): value is GardenDomainState {
  if (!value || typeof value !== 'object') return false;
  const state = value as GardenDomainState;
  return (
    typeof state.points === 'number' &&
    Array.isArray(state.tiles) &&
    state.tiles.length === GRID_SIZE * GRID_SIZE &&
    state.tiles.every(
      (tile) => tile && typeof tile === 'object' && typeof (tile as TileState).ground === 'string'
    )
  );
}

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (userId instanceof Response) return userId;

  const rows = await db.select().from(gardens).where(eq(gardens.userId, userId)).limit(1);
  if (rows.length === 0) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const row = rows[0];
  return Response.json({ points: row.points, tiles: row.tiles } satisfies GardenDomainState);
}

export async function PUT(request: Request) {
  const userId = await requireUserId(request);
  if (userId instanceof Response) return userId;

  const body = await request.json().catch(() => null);
  if (!isValidGardenState(body)) {
    return Response.json({ error: 'Invalid garden state' }, { status: 400 });
  }

  await db
    .insert(gardens)
    .values({ userId, points: body.points, tiles: body.tiles, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: gardens.userId,
      set: { points: body.points, tiles: body.tiles, updatedAt: new Date() },
    });

  return Response.json({ ok: true });
}

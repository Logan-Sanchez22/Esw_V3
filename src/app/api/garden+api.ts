// API ROUTE — a file named "+api.ts" is Expo Router's convention for a
// server endpoint rather than a screen: it runs only on the server (never
// bundled into the phone app) and exports one function per HTTP method it
// handles (`GET`, `PUT` below). garden-domain-store.tsx's sync effects call
// this route over plain `fetch(...)` as "/api/garden" — this file is the
// other end of that conversation. This is also why it's safe for this file
// to import `db` (src/db/client.ts) directly: that file requires a
// server-only DATABASE_URL that the phone app itself never has access to.
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

// Verifies the bearer token the app sent (see garden-domain-store.tsx's
// `Authorization: Bearer ${token}` header) and returns the signed-in user's
// id — or, if the token is missing/invalid, returns an actual `Response`
// object instead. The return type `string | Response` means callers below
// must check which one they got (`if (userId instanceof Response) return
// userId;`) before using it as a user id — TypeScript won't let them treat
// it as a plain string without that check first.
async function requireUserId(request: Request): Promise<string | Response> {
  const requestState = await clerkClient.authenticateRequest(request);
  if (!requestState.isAuthenticated) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return requestState.toAuth().userId;
}

// Same type-guard idea as garden-domain-store.tsx's isValidGardenState —
// this is the server's OWN copy of that check. It can't just trust
// whatever JSON the client PUTs here: a modified client, a replay, or a
// future app version with a different shape could send something that
// doesn't match `GardenDomainState`, and this is the boundary where that
// gets caught before it's written to the database.
function isValidGardenState(value: unknown): value is GardenDomainState {
  if (!value || typeof value !== 'object') return false;
  const state = value as GardenDomainState;
  return (
    typeof state.points === 'number' &&
    typeof state.totalPointsEarned === 'number' &&
    Array.isArray(state.tiles) &&
    state.tiles.length === GRID_SIZE * GRID_SIZE &&
    state.tiles.every(
      (tile) => tile && typeof tile === 'object' && typeof (tile as TileState).ground === 'string'
    )
  );
}

// Handles `GET /api/garden` — called once per sign-in (see
// garden-domain-store.tsx's initial-sync effect) to fetch whatever garden
// is already saved for this account, if any.
export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (userId instanceof Response) return userId;

  const rows = await db.select().from(gardens).where(eq(gardens.userId, userId)).limit(1);
  if (rows.length === 0) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const row = rows[0];
  return Response.json({
    points: row.points,
    totalPointsEarned: row.totalPointsEarned,
    tiles: row.tiles,
  } satisfies GardenDomainState);
}

// Handles `PUT /api/garden` — called by garden-domain-store.tsx both for
// a brand-new account's first save and for every ongoing debounced push
// after a change.
export async function PUT(request: Request) {
  const userId = await requireUserId(request);
  if (userId instanceof Response) return userId;

  const body = await request.json().catch(() => null);
  if (!isValidGardenState(body)) {
    return Response.json({ error: 'Invalid garden state' }, { status: 400 });
  }

  const values = {
    points: body.points,
    totalPointsEarned: body.totalPointsEarned,
    tiles: body.tiles,
    updatedAt: new Date(),
  };

  // "Upsert": insert a new row, unless one with this userId already exists
  // (`onConflictDoUpdate`), in which case update that existing row instead.
  // This is what lets the same endpoint serve both "this account's very
  // first save" and "just overwrite my existing garden" without the
  // caller needing to know which case it is.
  await db
    .insert(gardens)
    .values({ userId, ...values })
    .onConflictDoUpdate({
      target: gardens.userId,
      set: values,
    });

  return Response.json({ ok: true });
}

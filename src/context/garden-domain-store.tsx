// GARDEN DOMAIN STORE — this file is the bridge between the pure logic in
// garden-domain.ts and the actual React screens (garden.tsx, garden-alt.tsx).
// It uses React's "Context" pattern, which is how React shares a single
// piece of state across many components without passing it down as props
// through every layer in between:
//   1. `createContext` makes a shared "slot" that components can read from.
//   2. `GardenDomainProvider` (below) is a component that computes the
//      actual state and *provides* it into that slot via `<Context.Provider
//      value={...}>`. You wrap the part of the app that needs this data in
//      this provider once (see src/app/_layout.tsx).
//   3. `useContext` (wrapped below as `useGardenDomain()`) is how any
//      descendant component *reads* that value back out, no matter how
//      deeply nested it is.
// On top of that, this file also persists state to on-device storage
// (AsyncStorage — a simple key/value store that survives app restarts, but
// lives only on this one device) and syncs it to the remote Neon database
// (via fetch calls to our own /api/garden route) so a signed-in user's
// garden follows them across devices. AsyncStorage is the fast local cache;
// the database call is the slower, authoritative copy for that account.
import { useAuth } from '@clerk/expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';

import { getApiBaseUrl } from '@/lib/api-base-url';
import {
    addPoints as addPointsToState,
    CatalogItem,
    createEmptyGarden,
    DEFAULT_GROUND,
    GardenDomainState,
    GRID_SIZE,
    GroundFormation,
    PlacedItemId,
    TileState,
    UndoableAction,
    moveItem as moveItemInState,
    paintFormation as paintFormationInState,
    paintGround as paintGroundInState,
    placeItem as placeItemInState,
    pruneStaleFootprints,
    removeItem as removeItemInState,
    resolvePlacement,
    undoAction as undoActionInState,
} from '@/lib/garden-domain';

// Debounce for pushing local changes to the server after the initial sync —
// avoids a network call per tile placement while dragging/painting.
const PUSH_DEBOUNCE_MS = 1000;

const STORAGE_KEY = 'gryph-gardens:garden-state';
// v2: TileState gained `ground` (was a bare PlacedItemId[] before), see
// migrateFromUnversioned. v3: GardenDomainState gained `totalPointsEarned`
// (for the catalog-unlock progression hook), see migrateFromV2.
const CURRENT_VERSION = 3;

type PersistedGardenBlob = { version: number; state: GardenDomainState };

/** The v2 shape — points + grounded tiles, no totalPointsEarned yet. */
type V2GardenState = { points: number; tiles: TileState[] };

// `value is V2GardenState` is a "type predicate" — a special return-type
// annotation that tells TypeScript "if this function returns true, treat
// `value` as a V2GardenState from this point onward in the calling code."
// Functions written this way are called "type guards". Why this matters
// here: `value` comes from `JSON.parse`, whose return type is `any` — there
// is no compile-time guarantee the saved data is actually shaped like a
// garden (a user could have an old app version's save, a corrupted file,
// etc). This function checks the shape at runtime, field by field, so the
// rest of the code only ever sees data it has actually verified.
function isValidV2GardenState(value: unknown): value is V2GardenState {
    if (!value || typeof value !== 'object') return false;
    const state = value as V2GardenState;
    return (
        typeof state.points === 'number' &&
        Array.isArray(state.tiles) &&
        state.tiles.length === GRID_SIZE * GRID_SIZE &&
        state.tiles.every(
            (tile) => tile && typeof tile === 'object' && typeof (tile as TileState).ground === 'string'
        )
    );
}

function isValidGardenState(value: unknown): value is GardenDomainState {
    return isValidV2GardenState(value) && typeof (value as GardenDomainState).totalPointsEarned === 'number';
}

// The next two functions are a "migration chain": every time this file's
// saved shape changes (a field gets added, a type changes), CURRENT_VERSION
// goes up by one, and a `migrateFromX` function is added that upgrades the
// *previous* shape into the new one. This lets someone who installed the
// app a year ago, with an old save sitting in their phone's storage, still
// open it today without losing their garden — the hydration effect below
// tries the current version first, then falls back through older ones,
// migrating step by step until the data matches what the app expects now.
/**
 * Version-2 saves had no totalPointsEarned. There's no way to recover true
 * lifetime earnings from history, so this approximates it as the current
 * balance — undercounts for anyone who already spent points before this
 * field existed (they'll see a threshold item stay locked a little longer
 * than someone starting fresh with the same spend pattern would), but never
 * overcounts, and self-corrects as soon as more points are earned.
 */
function migrateFromV2(value: V2GardenState): GardenDomainState {
    return { ...value, totalPointsEarned: value.points };
}

/** Version-1 saves were a bare `{ points, tiles: PlacedItemId[] }` — one id per tile, no ground. */
function migrateFromUnversioned(value: unknown): V2GardenState | null {
    if (!value || typeof value !== 'object') return null;
    const legacy = value as { points?: unknown; tiles?: unknown };
    if (typeof legacy.points !== 'number' || !Array.isArray(legacy.tiles)) return null;
    if (legacy.tiles.length !== GRID_SIZE * GRID_SIZE) return null;
    if (!legacy.tiles.every((tile) => tile === null || typeof tile === 'string')) return null;

    return {
        points: legacy.points,
        tiles: (legacy.tiles as PlacedItemId[]).map((item) => ({ ground: DEFAULT_GROUND, item })),
    };
}

type Store = {
    state: GardenDomainState;
    placeItem: (index: number, item: CatalogItem) => void;
    removeItem: (index: number) => void;
    moveItem: (fromIndex: number, toIndex: number) => void;
    paintGround: (index: number, groundId: string) => void;
    paintFormation: (index: number, formation: GroundFormation) => void;
    addPoints: (amount: number) => void;
    resetGarden: () => void;
    /** The single most recent place/move/remove, or null once undone or
     * superseded by a newer one — see garden-domain.ts's UndoableAction. */
    lastAction: UndoableAction | null;
    undoLastAction: () => void;
};

// `createContext<Store | null>(null)` creates the "slot" mentioned above.
// It starts out null because, until a <GardenDomainProvider> actually
// mounts and supplies a real value, there's nothing to share yet.
const GardenDomainContext = createContext<Store | null>(null);

// This component holds the *actual* state and logic, and hands it out to
// every screen below it in the tree via the Context.Provider at the bottom
// of this function. `{ children }: { children: ReactNode }` is the standard
// way a React component accepts "whatever was nested inside it in JSX" —
// here, that's the rest of the app (see src/app/_layout.tsx for where this
// provider gets wrapped around everything).
export function GardenDomainProvider({ children }: { children: ReactNode }) {
    // `useState<GardenDomainState>(createEmptyGarden)` is the hook for
    // "a value that can change and should trigger a re-render when it
    // does." `state` is the current value; `setState` is the only way to
    // change it (components should never mutate `state` directly). Passing
    // `createEmptyGarden` (the function itself, not calling it) means React
    // only calls it once, on the very first render, to produce the initial
    // value.
    const [state, setState] = useState<GardenDomainState>(createEmptyGarden);
    // `useRef` holds a mutable value that does NOT trigger a re-render when
    // it changes (unlike useState) — it's for bookkeeping a component needs
    // to remember across renders but that never needs to show up on
    // screen. See src/lib/useStatusMessage.ts for a fuller explanation of
    // useRef vs useState. Skip the very first persist-on-change write — it
    // would otherwise overwrite whatever's in storage with the initial
    // empty garden before the hydration read below has a chance to run.
    const hydrated = useRef(false);
    // Mirrors `hydrated` as state so the server-sync effect (below) can react
    // to hydration finishing, without touching the AsyncStorage logic above.
    const [isHydrated, setIsHydrated] = useState(false);

    const { isLoaded: isAuthLoaded, isSignedIn, userId, getToken } = useAuth();
    // Which userId the initial pull-or-push has already run for — server
    // sync is additive on top of AsyncStorage, so this must only happen once
    // per sign-in, not on every state change.
    const syncedUserId = useRef<string | null>(null);
    // Set right after a server pull replaces local state, so the debounced
    // push effect below doesn't immediately echo it straight back.
    const skipNextPush = useRef(false);
    const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // In-memory only, deliberately not persisted or synced — undo is a
    // this-session, single-step convenience, not saved history.
    const [lastAction, setLastAction] = useState<UndoableAction | null>(null);

    // `useEffect(fn, deps)` runs `fn` after React renders, and re-runs it
    // whenever a value in the `deps` array changes. An empty array `[]`
    // means "run once, right after the component first mounts, and never
    // again" — exactly what one-time startup work (like reading saved data)
    // needs. This particular effect reads whatever was saved last time the
    // app ran (`AsyncStorage.getItem`, on-device storage — separate from
    // and faster than the Neon database synced further down this file) and
    // restores it into state.
    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY)
            .then((raw) => {
                if (!raw) return;
                const parsed = JSON.parse(raw);

                if (
                    parsed &&
                    typeof parsed === 'object' &&
                    (parsed as PersistedGardenBlob).version === CURRENT_VERSION &&
                    isValidGardenState((parsed as PersistedGardenBlob).state)
                ) {
                    // Prunes any anchorIndex left stale by a catalog item's
                    // footprint having since shrunk (e.g. Bench going back
                    // to 1x1 after briefly being 2x1) — see
                    // pruneStaleFootprints' own comment in garden-domain.ts.
                    setState(pruneStaleFootprints((parsed as PersistedGardenBlob).state));
                    return;
                }

                if (
                    parsed &&
                    typeof parsed === 'object' &&
                    (parsed as { version?: number }).version === 2 &&
                    isValidV2GardenState((parsed as { state?: unknown }).state)
                ) {
                    setState(migrateFromV2((parsed as { state: V2GardenState }).state));
                    return;
                }

                const migratedFromV1 = migrateFromUnversioned(parsed);
                if (migratedFromV1) setState(migrateFromV2(migratedFromV1));
            })
            .catch(() => {
                // Corrupt or unavailable storage — keep the empty garden already in state.
            })
            .finally(() => {
                hydrated.current = true;
                setIsHydrated(true);
            });
    }, []);

    // This effect's dependency array is `[state]`, not `[]` — so unlike the
    // one above, it re-runs every single time `state` changes, which is
    // exactly what "save to disk whenever the garden changes" needs.
    useEffect(() => {
        if (!hydrated.current) return;
        const blob: PersistedGardenBlob = { version: CURRENT_VERSION, state };
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(blob)).catch(() => {});
    }, [state]);

    // Initial sync: once signed in (and local storage has been read), pull
    // the server's garden if one exists, otherwise push the local garden up
    // as that account's first row. Runs once per userId.
    // `async () => { ... }` wrapped in parentheses and called immediately —
    // `(async () => { ... })()` — is a common pattern for running `await`
    // code inside a `useEffect`: the effect function itself can't be async,
    // so it defines a small async function and invokes it right away.
    // `await` pauses this function (not the whole app) until the Promise it
    // precedes resolves — e.g. `await getToken()` waits for Clerk's auth
    // token to actually come back before the next line runs with it.
    useEffect(() => {
        if (!isAuthLoaded || !isSignedIn || !userId || !isHydrated) return;
        if (syncedUserId.current === userId) return;
        syncedUserId.current = userId;

        (async () => {
            try {
                const token = await getToken();
                const baseUrl = getApiBaseUrl();
                const res = await fetch(`${baseUrl}/api/garden`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (res.status === 404) {
                    await fetch(`${baseUrl}/api/garden`, {
                        method: 'PUT',
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(state),
                    });
                    return;
                }

                if (!res.ok) return;

                const serverState = await res.json();
                if (isValidGardenState(serverState)) {
                    skipNextPush.current = true;
                    setState(pruneStaleFootprints(serverState));
                    // Whatever was locally undoable no longer applies to
                    // the tile indices in this freshly-pulled state.
                    setLastAction(null);
                }
            } catch {
                // Offline or server unreachable — local AsyncStorage state stands, try again next sign-in.
            }
        })();
    }, [isAuthLoaded, isSignedIn, userId, isHydrated, getToken, state]);

    // Ongoing sync: push local changes up after the initial sync has run,
    // debounced so rapid placement/painting doesn't fire a request per tile.
    // "Debounce" means: instead of acting immediately every time something
    // happens, wait a short delay, and if the thing happens again before
    // the delay is up, cancel the old wait and restart the timer. The net
    // effect is that a burst of changes (dragging to paint many tiles in a
    // row) only triggers one network call, shortly after the burst stops,
    // rather than one call per change.
    useEffect(() => {
        if (!isSignedIn || !userId || syncedUserId.current !== userId) return;
        if (skipNextPush.current) {
            skipNextPush.current = false;
            return;
        }

        // Cancel any still-pending push from a previous change before
        // scheduling a new one — this is the actual debounce mechanic.
        if (pushTimer.current) clearTimeout(pushTimer.current);
        pushTimer.current = setTimeout(() => {
            (async () => {
                try {
                    const token = await getToken();
                    const baseUrl = getApiBaseUrl();
                    await fetch(`${baseUrl}/api/garden`, {
                        method: 'PUT',
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(state),
                    });
                } catch {
                    // Offline or server unreachable — next change (or sign-in) will retry.
                }
            })();
        }, PUSH_DEBOUNCE_MS);

        // A useEffect can `return` a "cleanup function" — React calls it
        // right before the effect runs again (or when the component
        // unmounts). Here it clears any still-pending timer so a change
        // right before unmount/re-run can't fire a stray push later.
        return () => {
            if (pushTimer.current) clearTimeout(pushTimer.current);
        };
    }, [state, isSignedIn, userId, getToken]);

    // A sign-out clears which user the next sign-in should sync for — otherwise
    // signing into a different account on the same device would be skipped.
    useEffect(() => {
        if (!isSignedIn) syncedUserId.current = null;
    }, [isSignedIn]);

    // Each of these functions is what a screen actually calls (e.g.
    // `placeItem(index, item)` from a tile tap) — they're the only way
    // outside code is allowed to change the garden. Every one of them calls
    // into garden-domain.ts's pure functions (e.g. `placeItemInState`) to
    // compute the *next* state from scratch, rather than mutating `state`
    // in place — see garden-domain.ts's note on immutability at
    // `placeItem` for why that matters.
    // These read `state` directly (not a setState functional updater) so
    // they can tell whether the domain call actually changed anything —
    // needed to know whether to record it as undoable. Safe here: each is a
    // single synchronous user-tap handler, not a rapid-fire batch where
    // `state` could already be stale by the time it runs.
    const placeItem = (index: number, item: CatalogItem) => {
        const next = placeItemInState(state, index, item);
        if (next === state) return;
        setState(next);
        setLastAction({ kind: 'place', index, itemId: item.id, cost: item.cost });
    };

    const removeItem = (index: number) => {
        // Resolved rather than read directly off state.tiles[index] — index
        // may land on any cell of a multi-tile footprint (see
        // CatalogItem.footprint), not necessarily its anchor, and only the
        // anchor cell's TileState.item is ever non-null.
        const resolved = resolvePlacement(state, index);
        const next = removeItemInState(state, index);
        if (next === state || !resolved) return;
        setState(next);
        setLastAction({ kind: 'remove', index: resolved.anchorIndex, itemId: resolved.itemId });
    };

    const moveItem = (fromIndex: number, toIndex: number) => {
        const itemId = state.tiles[fromIndex]?.item ?? null;
        const next = moveItemInState(state, fromIndex, toIndex);
        if (next === state || itemId === null) return;
        setState(next);
        setLastAction({ kind: 'move', fromIndex, toIndex, itemId });
    };

    const paintGround = (index: number, groundId: string) => {
        setState((prev) => paintGroundInState(prev, index, groundId));
    };

    const paintFormation = (index: number, formation: GroundFormation) => {
        setState((prev) => paintFormationInState(prev, index, formation));
    };

    const addPoints = (amount: number) => {
        setState((prev) => addPointsToState(prev, amount));
    };

    const resetGarden = () => {
        setState(createEmptyGarden());
        setLastAction(null);
    };

    const undoLastAction = () => {
        if (!lastAction) return;
        setState((prev) => undoActionInState(prev, lastAction));
        setLastAction(null);
    };

    return (
        <GardenDomainContext.Provider
            value={{
                state,
                placeItem,
                removeItem,
                moveItem,
                paintGround,
                paintFormation,
                addPoints,
                resetGarden,
                lastAction,
                undoLastAction,
            }}
        >
            {children}
        </GardenDomainContext.Provider>
    );
}

/**
 * Both garden.tsx (isometric) and garden-alt.tsx (top-down) call this — same
 * data, different rendering. This is the one function screens actually
 * import and use; they never touch GardenDomainContext directly. The null
 * check exists because `useContext` would otherwise silently hand back
 * `null` (the default passed to createContext above) if this hook were
 * ever called from a component that isn't nested inside
 * <GardenDomainProvider> — throwing here turns that mistake into an
 * immediate, obvious error instead of a confusing crash somewhere else.
 */
export function useGardenDomain() {
    const ctx = useContext(GardenDomainContext);
    if (!ctx) throw new Error('useGardenDomain must be used inside GardenDomainProvider');
    return ctx;
}

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
    PlacedItemId,
    TileState,
    UndoableAction,
    moveItem as moveItemInState,
    paintGround as paintGroundInState,
    placeItem as placeItemInState,
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
    addPoints: (amount: number) => void;
    resetGarden: () => void;
    /** The single most recent place/move/remove, or null once undone or
     * superseded by a newer one — see garden-domain.ts's UndoableAction. */
    lastAction: UndoableAction | null;
    undoLastAction: () => void;
};

const GardenDomainContext = createContext<Store | null>(null);

export function GardenDomainProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<GardenDomainState>(createEmptyGarden);
    // Skip the very first persist-on-change write — it would otherwise
    // overwrite whatever's in storage with the initial empty garden before
    // the hydration read below has a chance to run.
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
                    setState((parsed as PersistedGardenBlob).state);
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

    useEffect(() => {
        if (!hydrated.current) return;
        const blob: PersistedGardenBlob = { version: CURRENT_VERSION, state };
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(blob)).catch(() => {});
    }, [state]);

    // Initial sync: once signed in (and local storage has been read), pull
    // the server's garden if one exists, otherwise push the local garden up
    // as that account's first row. Runs once per userId.
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
                    setState(serverState);
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
    useEffect(() => {
        if (!isSignedIn || !userId || syncedUserId.current !== userId) return;
        if (skipNextPush.current) {
            skipNextPush.current = false;
            return;
        }

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

        return () => {
            if (pushTimer.current) clearTimeout(pushTimer.current);
        };
    }, [state, isSignedIn, userId, getToken]);

    // A sign-out clears which user the next sign-in should sync for — otherwise
    // signing into a different account on the same device would be skipped.
    useEffect(() => {
        if (!isSignedIn) syncedUserId.current = null;
    }, [isSignedIn]);

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

/** Both garden.tsx (isometric) and garden-alt.tsx (top-down) call this — same data, different rendering. */
export function useGardenDomain() {
    const ctx = useContext(GardenDomainContext);
    if (!ctx) throw new Error('useGardenDomain must be used inside GardenDomainProvider');
    return ctx;
}

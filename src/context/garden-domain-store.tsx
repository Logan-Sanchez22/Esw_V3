import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';

import {
    addPoints as addPointsToState,
    CatalogItem,
    createEmptyGarden,
    DEFAULT_GROUND,
    GardenDomainState,
    GRID_SIZE,
    PlacedItemId,
    TileState,
    paintGround as paintGroundInState,
    placeItem as placeItemInState,
    removeItem as removeItemInState,
} from '@/lib/garden-domain';

const STORAGE_KEY = 'gryph-gardens:garden-state';
// Bumped when TileState gained `ground` (was a bare PlacedItemId[] before) —
// see migrateFromUnversioned below.
const CURRENT_VERSION = 2;

type PersistedGardenBlob = { version: number; state: GardenDomainState };

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

/** Version-1 saves were a bare `{ points, tiles: PlacedItemId[] }` — one id per tile, no ground. */
function migrateFromUnversioned(value: unknown): GardenDomainState | null {
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
    paintGround: (index: number, groundId: string) => void;
    addPoints: (amount: number) => void;
    resetGarden: () => void;
};

const GardenDomainContext = createContext<Store | null>(null);

export function GardenDomainProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<GardenDomainState>(createEmptyGarden);
    // Skip the very first persist-on-change write — it would otherwise
    // overwrite whatever's in storage with the initial empty garden before
    // the hydration read below has a chance to run.
    const hydrated = useRef(false);

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

                const migrated = migrateFromUnversioned(parsed);
                if (migrated) setState(migrated);
            })
            .catch(() => {
                // Corrupt or unavailable storage — keep the empty garden already in state.
            })
            .finally(() => {
                hydrated.current = true;
            });
    }, []);

    useEffect(() => {
        if (!hydrated.current) return;
        const blob: PersistedGardenBlob = { version: CURRENT_VERSION, state };
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(blob)).catch(() => {});
    }, [state]);

    const placeItem = (index: number, item: CatalogItem) => {
        setState((prev) => placeItemInState(prev, index, item));
    };

    const removeItem = (index: number) => {
        setState((prev) => removeItemInState(prev, index));
    };

    const paintGround = (index: number, groundId: string) => {
        setState((prev) => paintGroundInState(prev, index, groundId));
    };

    const addPoints = (amount: number) => {
        setState((prev) => addPointsToState(prev, amount));
    };

    const resetGarden = () => {
        setState(createEmptyGarden());
    };

    return (
        <GardenDomainContext.Provider
            value={{ state, placeItem, removeItem, paintGround, addPoints, resetGarden }}
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

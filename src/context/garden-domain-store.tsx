import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';

import {
    addPoints as addPointsToState,
    CatalogItem,
    createEmptyGarden,
    GardenDomainState,
    GRID_SIZE,
    placeItem as placeItemInState,
    removeItem as removeItemInState,
} from '@/lib/garden-domain';

const STORAGE_KEY = 'gryph-gardens:garden-state';

function isValidGardenState(value: unknown): value is GardenDomainState {
    if (!value || typeof value !== 'object') return false;
    const state = value as GardenDomainState;
    return (
        typeof state.points === 'number' &&
        Array.isArray(state.tiles) &&
        state.tiles.length === GRID_SIZE * GRID_SIZE
    );
}

type Store = {
    state: GardenDomainState;
    placeItem: (index: number, item: CatalogItem) => void;
    removeItem: (index: number) => void;
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
                if (isValidGardenState(parsed)) setState(parsed);
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
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
    }, [state]);

    const placeItem = (index: number, item: CatalogItem) => {
        setState((prev) => placeItemInState(prev, index, item));
    };

    const removeItem = (index: number) => {
        setState((prev) => removeItemInState(prev, index));
    };

    const addPoints = (amount: number) => {
        setState((prev) => addPointsToState(prev, amount));
    };

    const resetGarden = () => {
        setState(createEmptyGarden());
    };

    return (
        <GardenDomainContext.Provider value={{ state, placeItem, removeItem, addPoints, resetGarden }}>
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

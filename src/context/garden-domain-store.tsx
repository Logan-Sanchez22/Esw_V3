import { createContext, ReactNode, useContext, useState } from 'react';

import {
    addPoints as addPointsToState,
    CatalogItem,
    createEmptyGarden,
    GardenDomainState,
    placeItem as placeItemInState,
} from '@/lib/garden-domain';

type Store = {
    state: GardenDomainState;
    placeItem: (index: number, item: CatalogItem) => void;
    addPoints: (amount: number) => void;
};

const GardenDomainContext = createContext<Store | null>(null);

export function GardenDomainProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<GardenDomainState>(createEmptyGarden);

    const placeItem = (index: number, item: CatalogItem) => {
        setState((prev) => placeItemInState(prev, index, item));
    };

    const addPoints = (amount: number) => {
        setState((prev) => addPointsToState(prev, amount));
    };

    return (
        <GardenDomainContext.Provider value={{ state, placeItem, addPoints }}>
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

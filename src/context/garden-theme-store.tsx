import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

/**
 * Which backdrop the garden screens render on — a user preference, not a
 * real time-of-day system (no clock, no lighting changes on decorations,
 * no schedule). 'day' is the original bright sky-blue look this app always
 * had; 'night' is a dark panel matching the rest of the app's theme. Both
 * garden screens and Settings' toggle need to react live to this changing,
 * so it's a Context + AsyncStorage store, the same pattern as
 * garden-domain-store.tsx and quest-domain-store.tsx — a plain module-level
 * variable (like sound.ts uses) wouldn't re-render an already-mounted
 * garden screen when the preference changes elsewhere.
 */
export type GardenScheme = 'day' | 'night';

const STORAGE_KEY = 'gryph-gardens:garden-scheme';

type Store = {
    scheme: GardenScheme;
    setScheme: (scheme: GardenScheme) => void;
};

const GardenThemeContext = createContext<Store | null>(null);

export function GardenThemeProvider({ children }: { children: ReactNode }) {
    // Defaults to 'day' — the original look, kept as the default now that
    // it's a choice rather than the only option.
    const [scheme, setSchemeState] = useState<GardenScheme>('day');

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY)
            .then((raw) => {
                if (raw === 'day' || raw === 'night') setSchemeState(raw);
            })
            .catch(() => {
                // Corrupt or unavailable storage — keep the default ('day').
            });
    }, []);

    const setScheme = (next: GardenScheme) => {
        setSchemeState(next);
        AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
            // Best-effort — worst case the preference doesn't survive a restart.
        });
    };

    return <GardenThemeContext.Provider value={{ scheme, setScheme }}>{children}</GardenThemeContext.Provider>;
}

/** Both garden.tsx (isometric) and garden-alt.tsx (top-down) call this, plus Settings' toggle. */
export function useGardenTheme() {
    const ctx = useContext(GardenThemeContext);
    if (!ctx) throw new Error('useGardenTheme must be used inside GardenThemeProvider');
    return ctx;
}

import AsyncStorage from '@react-native-async-storage/async-storage';

// Beginner orientation: AsyncStorage is React Native's equivalent of a web
// browser's localStorage — a simple on-device key/value store that survives
// the app being closed and reopened. It's used throughout this app (garden
// state, quest state, sound preferences, and this onboarding flag) for
// "remember this on this specific phone," as opposed to the Neon/Postgres
// database (src/db/), which is for "remember this for this specific signed-
// in account, across devices."

/**
 * Whether this device has ever finished the onboarding intro — checked once
 * by (tabs)/_layout.tsx before deciding whether to show it, and set by
 * onboarding.tsx once the user reaches its last slide (or taps Skip).
 * Device-scoped, not account-scoped: it gates the intro, not auth.
 */
const ONBOARDING_STORAGE_KEY = 'gryph-gardens:onboarding-complete';

export async function hasSeenOnboarding(): Promise<boolean> {
    try {
        return (await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY)) === 'true';
    } catch {
        // A broken storage read shouldn't trap the user behind onboarding forever.
        return true;
    }
}

export async function markOnboardingSeen(): Promise<void> {
    try {
        await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    } catch {
        // Best-effort — worst case onboarding shows again next launch.
    }
}

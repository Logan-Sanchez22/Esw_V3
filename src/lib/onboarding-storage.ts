import AsyncStorage from '@react-native-async-storage/async-storage';

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

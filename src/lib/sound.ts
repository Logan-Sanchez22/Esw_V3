import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

/**
 * Short one-shot sound effects (placement, removal, quest completion) —
 * plain module-level singletons via `createAudioPlayer`, not the
 * `useAudioPlayer` hook, since these are triggered from event handlers
 * across both garden screens and quest-page, not tied to one component's
 * lifecycle. This is the one genuinely new native dependency added this
 * round (expo-audio, matched to the installed Expo SDK 57 version) and has
 * not been exercised on a real device — every entry point below is
 * defensive on purpose: a failure to load or play a sound must never
 * interrupt gameplay, so every call is wrapped and swallows its own errors.
 * Toggle via setSoundEnabled (see Settings' "Sound Effects" row).
 */

const SOUND_ENABLED_STORAGE_KEY = 'gryph-gardens:sound-enabled';

let soundEnabled = true;

export function setSoundEnabled(enabled: boolean): void {
    soundEnabled = enabled;
    AsyncStorage.setItem(SOUND_ENABLED_STORAGE_KEY, enabled ? 'true' : 'false').catch(() => {
        // Best-effort — worst case the preference doesn't survive a restart.
    });
}

export function isSoundEnabled(): boolean {
    return soundEnabled;
}

/** Call once near app startup (see settings.tsx) to restore the saved preference. */
export async function loadSoundPreference(): Promise<void> {
    try {
        const raw = await AsyncStorage.getItem(SOUND_ENABLED_STORAGE_KEY);
        if (raw !== null) soundEnabled = raw === 'true';
    } catch {
        // Corrupt or unavailable storage — keep the default (enabled).
    }
}

export type SoundEffect = 'place' | 'remove' | 'quest';

// Static requires — Metro needs the literal path at build time, so this
// can't be a dynamic Record lookup keyed by a runtime string.
const SOURCES: Record<SoundEffect, number> = {
    place: require('../../assets/sounds/place.wav'),
    remove: require('../../assets/sounds/remove.wav'),
    quest: require('../../assets/sounds/quest.wav'),
};

const players: Partial<Record<SoundEffect, AudioPlayer>> = {};

function getPlayer(effect: SoundEffect): AudioPlayer | null {
    try {
        let player = players[effect];
        if (!player) {
            player = createAudioPlayer(SOURCES[effect]);
            players[effect] = player;
        }
        return player;
    } catch {
        // Player creation can fail if the audio subsystem isn't available on
        // this platform/build — fall back to no sound rather than throwing.
        return null;
    }
}

/** Fire-and-forget — safe to call from any tap handler without awaiting. */
export function playSound(effect: SoundEffect): void {
    if (!soundEnabled) return;
    const player = getPlayer(effect);
    if (!player) return;

    (async () => {
        try {
            // Rewind first so rapid repeated taps (e.g. quickly placing
            // several items) replay from the start instead of doing nothing
            // once a previous play of the same short clip has finished.
            await player.seekTo(0);
            player.play();
        } catch {
            // Best-effort — never let a sound failure interrupt gameplay.
        }
    })();
}

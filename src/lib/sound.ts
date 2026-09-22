import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

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

/**
 * Call once near app startup (see src/app/_layout.tsx) to restore the saved
 * preference and configure the native audio session.
 *
 * expo-audio's own TS docs claim `playsInSilentMode` defaults to `true`, but
 * the installed native default on iOS (ios/AudioRecords.swift) is actually
 * `false` until `setAudioModeAsync` is called at least once — without this,
 * every effect gets silently muted by the audio session whenever the
 * device's silent switch is on (Android's native default is already `true`,
 * matching the docs). `interruptionMode: 'mixWithOthers'` matches what's
 * actually wanted for short SFX (also already the library default, set
 * explicitly here since we're touching this call anyway).
 */
export async function loadSoundPreference(): Promise<void> {
    try {
        const raw = await AsyncStorage.getItem(SOUND_ENABLED_STORAGE_KEY);
        if (raw !== null) soundEnabled = raw === 'true';
    } catch {
        // Corrupt or unavailable storage — keep the default (enabled).
    }

    try {
        await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' });
    } catch (error) {
        // Best-effort — worst case effects stay silenced by the silent switch.
        if (__DEV__) console.warn('[sound] setAudioModeAsync failed:', error);
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
    } catch (error) {
        // Player creation can fail if the audio subsystem isn't available on
        // this platform/build — fall back to no sound rather than throwing.
        if (__DEV__) console.warn(`[sound] createAudioPlayer('${effect}') failed:`, error);
        return null;
    }
}

/** Fire-and-forget — safe to call from any tap handler without awaiting. */
export function playSound(effect: SoundEffect): void {
    if (!soundEnabled) return;
    const player = getPlayer(effect);
    if (!player) return;

    try {
        // `.play()` unconditionally and synchronously, matching expo-audio's
        // own documented usage (calling it immediately after creation, with
        // no seek). An earlier version awaited `player.seekTo(0)` before
        // play() — if the player hadn't finished loading yet, that seek
        // could reject before play() ever ran, and the try/catch around it
        // would swallow the rejection, silently skipping the sound entirely.
        player.play();
        // Best-effort rewind for a replay (once a previous play of this same
        // short clip has already finished) — fired without blocking play()
        // above, so a still-loading player never has its first play skipped.
        if (player.currentTime > 0) {
            player.seekTo(0).catch(() => {});
        }
    } catch (error) {
        // Best-effort — never let a sound failure interrupt gameplay.
        if (__DEV__) console.warn(`[sound] play('${effect}') failed:`, error);
    }
}

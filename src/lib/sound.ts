import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

/**
 * Sound effects (placement, removal, quest completion) and a single looping
 * ambient background track — plain module-level singletons via
 * `createAudioPlayer`, not the `useAudioPlayer` hook, since these are
 * triggered from event handlers across both garden screens and quest-page,
 * not tied to one component's lifecycle. This is the one genuinely new
 * native dependency added this round (expo-audio, matched to the installed
 * Expo SDK 57 version) and has not been exercised on much real-device
 * testing — every entry point below is defensive on purpose: a failure to
 * load or play audio must never interrupt gameplay, so every call is
 * wrapped and swallows its own errors (with a __DEV__-only console.warn so
 * a real failure still shows up somewhere).
 *
 * Toggle/adjust via setSoundEnabled / setMusicEnabled / setVolume — see
 * Settings' "Sound Effects" and "Music" rows.
 */

const SOUND_ENABLED_STORAGE_KEY = 'gryph-gardens:sound-enabled';
const MUSIC_ENABLED_STORAGE_KEY = 'gryph-gardens:music-enabled';
const VOLUME_STORAGE_KEY = 'gryph-gardens:volume';

let soundEnabled = true;
let musicEnabled = true;
// Shared by both SFX and music — one "how loud" knob, matching the single
// volume slider in Settings, distinct from the separate on/off toggles for
// each category.
let volume = 1;

export function setSoundEnabled(enabled: boolean): void {
    soundEnabled = enabled;
    AsyncStorage.setItem(SOUND_ENABLED_STORAGE_KEY, enabled ? 'true' : 'false').catch(() => {
        // Best-effort — worst case the preference doesn't survive a restart.
    });
}

export function isSoundEnabled(): boolean {
    return soundEnabled;
}

export function setMusicEnabled(enabled: boolean): void {
    musicEnabled = enabled;
    AsyncStorage.setItem(MUSIC_ENABLED_STORAGE_KEY, enabled ? 'true' : 'false').catch(() => {
        // Best-effort — worst case the preference doesn't survive a restart.
    });
    if (enabled) startMusic();
    else stopMusic();
}

export function isMusicEnabled(): boolean {
    return musicEnabled;
}

export function setVolume(v: number): void {
    volume = Math.max(0, Math.min(1, v));
    AsyncStorage.setItem(VOLUME_STORAGE_KEY, String(volume)).catch(() => {
        // Best-effort — worst case the preference doesn't survive a restart.
    });
    applyVolumeToAllPlayers();
}

export function getVolume(): number {
    return volume;
}

function applyVolumeToAllPlayers(): void {
    try {
        for (const player of Object.values(players)) {
            if (player) player.volume = volume;
        }
        if (musicPlayer) musicPlayer.volume = volume;
    } catch {
        // Best-effort — a failure here just leaves an existing player at its
        // previous volume until the next successful change.
    }
}

/**
 * Call once near app startup (see src/app/_layout.tsx) to restore saved
 * preferences, configure the native audio session, and start music if it
 * was left on.
 *
 * expo-audio's own TS docs claim `playsInSilentMode` defaults to `true`, but
 * the installed native default on iOS (ios/AudioRecords.swift) is actually
 * `false` until `setAudioModeAsync` is called at least once — without this,
 * every effect gets silently muted by the audio session whenever the
 * device's silent switch is on (Android's native default is already `true`,
 * matching the docs). `interruptionMode: 'mixWithOthers'` matches what's
 * actually wanted for short SFX and background music alike (also already
 * the library default, set explicitly here since we're touching this call
 * anyway).
 */
export async function loadSoundPreference(): Promise<void> {
    try {
        const [rawSound, rawMusic, rawVolume] = await Promise.all([
            AsyncStorage.getItem(SOUND_ENABLED_STORAGE_KEY),
            AsyncStorage.getItem(MUSIC_ENABLED_STORAGE_KEY),
            AsyncStorage.getItem(VOLUME_STORAGE_KEY),
        ]);
        if (rawSound !== null) soundEnabled = rawSound === 'true';
        if (rawMusic !== null) musicEnabled = rawMusic === 'true';
        if (rawVolume !== null) {
            const parsed = Number(rawVolume);
            if (Number.isFinite(parsed)) volume = Math.max(0, Math.min(1, parsed));
        }
    } catch {
        // Corrupt or unavailable storage — keep the defaults (both enabled, full volume).
    }

    try {
        await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' });
    } catch (error) {
        // Best-effort — worst case effects stay silenced by the silent switch.
        if (__DEV__) console.warn('[sound] setAudioModeAsync failed:', error);
    }

    if (musicEnabled) startMusic();
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
            player.volume = volume;
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

// A single looping ambient track — procedurally synthesized (see
// scripts referenced in the commit that added it), not a downloaded
// file, since general internet access isn't available from this
// environment and a license can't be verified for anything fetched blind.
const MUSIC_SOURCE = require('../../assets/sounds/music-ambient.wav');
let musicPlayer: AudioPlayer | null = null;

function getMusicPlayer(): AudioPlayer | null {
    try {
        if (!musicPlayer) {
            musicPlayer = createAudioPlayer(MUSIC_SOURCE);
            musicPlayer.loop = true;
            musicPlayer.volume = volume;
        }
        return musicPlayer;
    } catch (error) {
        if (__DEV__) console.warn('[sound] createAudioPlayer(music) failed:', error);
        return null;
    }
}

function startMusic(): void {
    if (!musicEnabled) return;
    const player = getMusicPlayer();
    if (!player) return;
    try {
        player.play();
    } catch (error) {
        if (__DEV__) console.warn('[sound] music play() failed:', error);
    }
}

function stopMusic(): void {
    try {
        musicPlayer?.pause();
    } catch {
        // Best-effort — worst case music keeps playing until the next toggle.
    }
}

import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Beginner orientation: `Platform.OS` is how React Native code checks which
// platform it's running on ('ios', 'android', or 'web') — used here because
// phones and web browsers need different URLs to reach this same app's own
// backend routes (see src/app/api/).

/**
 * Web calls its own API routes with a relative path. Native has no origin of
 * its own, so during development it targets the Metro/Expo dev server itself
 * (which also serves +api.ts routes) via `hostUri` — e.g. "192.168.1.5:8081".
 * A deployed backend would set EXPO_PUBLIC_API_BASE_URL instead, which isn't
 * wired up yet since this app has no production API deployment.
 */
export function getApiBaseUrl(): string {
  const override = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (override) return override;
  if (Platform.OS === 'web') return '';

  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return '';
  return `http://${hostUri}`;
}

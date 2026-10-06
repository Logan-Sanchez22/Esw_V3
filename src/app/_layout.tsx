// ROOT LAYOUT — the top-level component for the entire app. Expo Router
// (the file-based navigation system this app uses — a file under
// src/app/ becomes a screen/route automatically, based on its path) always
// renders this file first, around every other screen. Two jobs happen
// here: loading custom fonts before anything is shown, and wrapping the
// whole app in every "Provider" that screens need to read shared state
// from (Clerk for auth, plus the three Context stores from src/context/).
import {SplashScreen, Stack} from "expo-router";
import "@/global.css"
import {useFonts} from "expo-font";
import {useEffect} from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";

import { GardenDomainProvider } from "@/context/garden-domain-store";
import { GardenThemeProvider } from "@/context/garden-theme-store";
import { QuestDomainProvider } from "@/context/quest-domain-store";
import { loadSoundPreference } from "@/lib/sound";

// `EXPO_PUBLIC_`-prefixed env vars are the only kind Expo bundles into the
// actual app code shipped to a user's phone — anything without that prefix
// (like DATABASE_URL in src/db/client.ts) stays server-only and is never
// readable from here. See .env.example for the full list this app needs.
const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'sans-regular': require('../../assets/fonts/PlusJakartaSans-Regular.ttf'),
    'sans-bold': require('../../assets/fonts/PlusJakartaSans-Bold.ttf'),
    'sans-medium': require('../../assets/fonts/PlusJakartaSans-Medium.ttf'),
    'sans-semibold': require('../../assets/fonts/PlusJakartaSans-SemiBold.ttf'),
    'sans-extrabold': require('../../assets/fonts/PlusJakartaSans-ExtraBold.ttf'),
    'sans-light': require('../../assets/fonts/PlusJakartaSans-Light.ttf'),
  })

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded])

  // Fire-and-forget — sound defaults to enabled, so nothing needs to wait
  // on this resolving before the app renders.
  useEffect(() => {
    loadSoundPreference();
  }, [])

  // Returning `null` here means React Native just keeps showing the native
  // splash screen (see SplashScreen.hideAsync() above) — nothing renders
  // until the fonts this app needs are actually ready to use.
  if (!fontsLoaded) return null;

  if (!CLERK_PUBLISHABLE_KEY) {
    throw new Error(
      'Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY — copy .env.example to .env and fill in your Clerk publishable key.'
    );
  }

  // The nesting order of these providers matters only where one depends on
  // another; here none do, so this is really just "every screen needs auth,
  // garden state, quest state, and the theme preference all at once."
  // `<Stack screenOptions={{headerShown: false}} />` is Expo Router's way of
  // saying "render whichever screen under src/app/ matches the current
  // route, without its own built-in header bar" (each screen draws its own
  // header instead).
  return (
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <GardenDomainProvider>
            <QuestDomainProvider>
              <GardenThemeProvider>
                <Stack screenOptions={{headerShown: false}} />
              </GardenThemeProvider>
            </QuestDomainProvider>
          </GardenDomainProvider>
        </GestureHandlerRootView>
      </ClerkProvider>
  );
}

import {SplashScreen, Stack} from "expo-router";
import "@/global.css"
import {useFonts} from "expo-font";
import {useEffect} from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";

import { GardenDomainProvider } from "@/context/garden-domain-store";
import { QuestDomainProvider } from "@/context/quest-domain-store";

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

  if (!fontsLoaded) return null;

  if (!CLERK_PUBLISHABLE_KEY) {
    throw new Error(
      'Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY — copy .env.example to .env and fill in your Clerk publishable key.'
    );
  }

  return (
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <GardenDomainProvider>
            <QuestDomainProvider>
              <Stack screenOptions={{headerShown: false}} />
            </QuestDomainProvider>
          </GardenDomainProvider>
        </GestureHandlerRootView>
      </ClerkProvider>
  );
}

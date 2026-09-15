import {SplashScreen, Stack} from "expo-router";
import "@/global.css"
import {useFonts} from "expo-font";
import {useEffect} from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { GardenDomainProvider } from "@/context/garden-domain-store";

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

  return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GardenDomainProvider>
          <Stack screenOptions={{headerShown: false}} />
        </GardenDomainProvider>
      </GestureHandlerRootView>
  );
}
// The "(auth)" folder name is Expo Router's "route group" syntax — the
// parentheses mean this folder name does NOT become part of the URL path
// (so sign-in.tsx is reachable at "/sign-in", not "/(auth)/sign-in"), it
// just groups these screens together and gives them their own layout file.
// This layout is intentionally minimal — just a Stack navigator with no
// header — the actual auth logic lives in sign-in.tsx / sign-up.tsx.
import { Stack } from "expo-router";
import "@/global.css"

export default function RootLayout() {
    return <Stack screenOptions={{headerShown: false}} />;
}

// The "(auth)" folder name is Expo Router's "route group" syntax — the
// parentheses mean this folder name does NOT become part of the URL path
// (so sign-in.tsx is reachable at "/sign-in", not "/(auth)/sign-in"), it
// just groups these screens together and gives them their own layout file.
// This layout is just a Stack navigator with no header plus one guard —
// the actual auth logic lives in sign-in.tsx / sign-up.tsx.
import { Redirect, Stack } from "expo-router";
import { useAuth } from "@clerk/expo";
import "@/global.css"

export default function RootLayout() {
    const { isLoaded, isSignedIn } = useAuth();

    // Mirror of (tabs)/_layout.tsx's guard: an already-signed-in user has
    // no business on sign-in/sign-up, and letting them stay makes Clerk
    // reject every attempt with `session_exists`.
    if (isLoaded && isSignedIn) return <Redirect href="/" />;

    return <Stack screenOptions={{headerShown: false}} />;
}

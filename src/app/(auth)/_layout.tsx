// The "(auth)" folder name is Expo Router's "route group" syntax — the
// parentheses mean this folder name does NOT become part of the URL path
// (so sign-in.tsx is reachable at "/sign-in", not "/(auth)/sign-in"), it
// just groups these screens together and gives them their own layout file.
// This layout is just a Stack navigator with no header plus one guard —
// the actual auth logic lives in sign-in.tsx / sign-up.tsx.
import { useEffect } from "react";
import { Redirect, Stack } from "expo-router";
import { useAuth, useClerk } from "@clerk/expo";
import "@/global.css"

export default function RootLayout() {
    const { isLoaded, isSignedIn } = useAuth();
    const clerk = useClerk();

    // A session can exist on the device without counting as signed in —
    // e.g. a *pending* session (one with an unfinished Clerk session task,
    // which useAuth() treats as signed-out), or one left behind by an
    // interrupted sign-in. Arriving here with one means the user can't use
    // it, and Clerk would reject every new sign-in with `session_exists`
    // until it's gone. Clear it so signing in always works.
    // (The status check keeps this from racing a sign-in that just
    // succeeded, where clerk.session can update a render before useAuth().)
    const hasUnusableSession = isLoaded && !isSignedIn && !!clerk.session && clerk.session.status !== 'active';
    useEffect(() => {
        if (hasUnusableSession) clerk.signOut();
    }, [hasUnusableSession, clerk]);

    // Mirror of (tabs)/_layout.tsx's guard: an already-signed-in user has
    // no business on sign-in/sign-up, and letting them stay makes Clerk
    // reject every attempt with `session_exists`.
    if (isLoaded && isSignedIn) return <Redirect href="/" />;

    return <Stack screenOptions={{headerShown: false}} />;
}

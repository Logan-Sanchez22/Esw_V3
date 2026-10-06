import { useEffect, useRef, useState } from 'react';

/**
 * A short-lived "why didn't that work" banner — shared by both garden screens
 * so a blocked tap (occupied tile, insufficient points) says so instead of
 * silently doing nothing.
 */
// Beginner orientation: this is a "custom hook" — a function whose name
// starts with `use` and that itself calls other React hooks inside it
// (useState, useRef, useEffect below). It's a way to package up a reusable
// bit of stateful behavior ("show a message, then auto-clear it after a
// delay") so any component can call `useStatusMessage()` and get working
// message state without copy-pasting this logic everywhere.
export function useStatusMessage(durationMs = 1500) {
    // useState gives a piece of state (`message`) plus a function to update
    // it (`setMessage`). Calling setMessage triggers React to re-render
    // whatever component used this hook, with the new value.
    const [message, setMessage] = useState<string | null>(null);
    // useRef holds a mutable value that does NOT trigger a re-render when it
    // changes — perfect for something like a timer handle that the
    // component needs to remember, but that the screen shouldn't visually
    // update in response to.
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showMessage = (text: string) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setMessage(text);
        timeoutRef.current = setTimeout(() => setMessage(null), durationMs);
    };

    // useEffect runs side effects (things that reach outside of just
    // "compute and display"). Returning a function from it (as below) is
    // React's "cleanup" convention — that returned function runs when the
    // component using this hook unmounts (e.g. the user navigates away),
    // so a pending timer doesn't try to update a screen that's gone. The
    // empty `[]` dependency array means this effect's setup only runs once,
    // when the component first mounts.
    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    return { message, showMessage };
}

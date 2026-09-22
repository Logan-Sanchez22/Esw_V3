import { useEffect, useRef, useState } from 'react';

/**
 * A short-lived "why didn't that work" banner — shared by both garden screens
 * so a blocked tap (occupied tile, insufficient points) says so instead of
 * silently doing nothing.
 */
export function useStatusMessage(durationMs = 1500) {
    const [message, setMessage] = useState<string | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showMessage = (text: string) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setMessage(text);
        timeoutRef.current = setTimeout(() => setMessage(null), durationMs);
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    return { message, showMessage };
}

import { useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';

/**
 * Purely cosmetic drifting leaves/sparkles over a garden screen. Rendered as
 * a screen-space overlay SIBLING of the pan/zoom grid (never nested inside
 * its Reanimated-transformed Animated.View) — that's the one arrangement
 * this session already confirmed is safe: continuous useAnimatedStyle
 * transforms are fine there, it was layout entering/exiting animations
 * nested inside a transformed ancestor that resolved positions wrong (see
 * garden.tsx's placement-animation revert history). No emoji/particle art
 * exists in the sprite atlases (checked), so this uses plain text glyphs
 * rather than repurposing an unrelated decoration fragment as a particle.
 */
const EMOJIS = ['🍃', '✨', '🍂'];

type Particle = {
    emoji: string;
    leftPercent: number;
    duration: number;
    delay: number;
    drift: number;
};

function makeParticles(count: number, seed: number): Particle[] {
    return Array.from({ length: count }, (_, i) => {
        const n = seed + i;
        return {
            emoji: EMOJIS[n % EMOJIS.length],
            leftPercent: (n * 37) % 100,
            duration: 6000 + ((n * 733) % 4000),
            delay: (n * 517) % 5000,
            drift: (n % 2 === 0 ? 1 : -1) * (10 + ((n * 13) % 20)),
        };
    });
}

function FallingParticle({
    particle,
    viewportWidth,
    viewportHeight,
}: {
    particle: Particle;
    viewportWidth: number;
    viewportHeight: number;
}) {
    const progress = useSharedValue(0);

    useEffect(() => {
        progress.value = withDelay(
            particle.delay,
            withRepeat(withTiming(1, { duration: particle.duration, easing: Easing.linear }), -1, false)
        );
        // Deliberately once — a continuous loop, not something that reacts to prop changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const travel = viewportHeight + 40;

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: -20 + progress.value * travel },
            { translateX: Math.sin(progress.value * Math.PI * 2) * particle.drift },
        ],
        opacity: progress.value < 0.1 ? progress.value * 10 : progress.value > 0.85 ? (1 - progress.value) * 6.7 : 1,
    }));

    return (
        <Animated.Text
            style={[
                { position: 'absolute', top: 0, left: (particle.leftPercent / 100) * viewportWidth, fontSize: 16 },
                animatedStyle,
            ]}
        >
            {particle.emoji}
        </Animated.Text>
    );
}

export function AmbientParticles({ count = 5, seed = 0 }: { count?: number; seed?: number }) {
    const [size, setSize] = useState({ width: 0, height: 0 });
    const particles = useMemo(() => makeParticles(count, seed), [count, seed]);

    const handleLayout = (event: LayoutChangeEvent) => {
        setSize(event.nativeEvent.layout);
    };

    return (
        <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={handleLayout}>
            {size.width > 0 &&
                size.height > 0 &&
                particles.map((particle, i) => (
                    <FallingParticle key={i} particle={particle} viewportWidth={size.width} viewportHeight={size.height} />
                ))}
        </View>
    );
}

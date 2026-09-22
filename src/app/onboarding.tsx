import { useRef, useState } from 'react';
import { Dimensions, NativeScrollEvent, NativeSyntheticEvent, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { markOnboardingSeen } from '@/lib/onboarding-storage';
import { colors, spacing, typography } from '../../constants/theme';

const { width } = Dimensions.get('window');

const SLIDES = [
    {
        emoji: '🌱',
        title: 'Grow a Real Garden',
        body: 'Gryph Gardens turns everyday sustainable choices into a garden you build and shape yourself.',
    },
    {
        emoji: '⭐',
        title: 'Earn Points from Quests',
        body: 'Complete simple sustainability quests — recycle something, walk instead of driving, turn off unused lights — to earn points.',
    },
    {
        emoji: '🧭',
        title: 'Two Ways to View It',
        body: 'Explore your garden in a 3D isometric view, or from directly above — same garden, whichever you like better.',
    },
] as const;

export default function Onboarding() {
    const [index, setIndex] = useState(0);
    const scrollRef = useRef<ScrollView>(null);
    const isLast = index === SLIDES.length - 1;

    const finish = async () => {
        await markOnboardingSeen();
        // Back to root, not straight to sign-up — (tabs)/_layout.tsx re-checks
        // onboarding + auth state there and routes correctly either way
        // (already-signed-in devices land in the app, not a redundant sign-up).
        router.replace('/');
    };

    const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        setIndex(Math.round(event.nativeEvent.contentOffset.x / width));
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ position: 'absolute', top: spacing[5], right: spacing[5], zIndex: 1 }}>
                <Text
                    onPress={finish}
                    style={{ color: colors.mutedForeground, fontFamily: typography.label.fontFamily, fontSize: typography.label.fontSize }}
                >
                    Skip
                </Text>
            </View>

            <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={onScrollEnd}
                style={{ flex: 1 }}
            >
                {SLIDES.map((slide) => (
                    <View key={slide.title} style={{ width, alignItems: 'center', justifyContent: 'center', padding: spacing[8] }}>
                        <Text style={{ fontSize: 72, marginBottom: spacing[6] }}>{slide.emoji}</Text>
                        <Text
                            style={{
                                color: colors.foreground,
                                fontSize: typography.display.fontSize,
                                fontFamily: typography.display.fontFamily,
                                textAlign: 'center',
                                marginBottom: spacing[3],
                            }}
                        >
                            {slide.title}
                        </Text>
                        <Text
                            style={{
                                color: colors.mutedForeground,
                                fontSize: typography.body.fontSize,
                                fontFamily: typography.body.fontFamily,
                                textAlign: 'center',
                            }}
                        >
                            {slide.body}
                        </Text>
                    </View>
                ))}
            </ScrollView>

            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: spacing[6] }}>
                {SLIDES.map((slide, i) => (
                    <View
                        key={slide.title}
                        style={{
                            width: i === index ? 20 : 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: i === index ? colors.primary : colors.border,
                        }}
                    />
                ))}
            </View>

            <View style={{ paddingHorizontal: spacing[5], paddingBottom: spacing[5] }}>
                <Button
                    label={isLast ? 'Get Started' : 'Next'}
                    onPress={() => {
                        if (isLast) {
                            finish();
                            return;
                        }
                        const nextIndex = index + 1;
                        scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
                        setIndex(nextIndex);
                    }}
                />
            </View>
        </SafeAreaView>
    );
}

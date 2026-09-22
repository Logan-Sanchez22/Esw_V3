import { Alert, ScrollView, Text, View } from 'react-native'
import React, { useState } from 'react'
import { styled } from "nativewind";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { useAuth, useUser } from "@clerk/expo";
import Slider from '@react-native-community/slider';

import { Button, ScreenHeader, SectionHeading, StatPill } from '@/components/ui';
import { ModeToggle } from '@/components/ModeToggle';
import { completedTodayCount, QUESTS } from '@/lib/quest-domain';
import { getVolume, isMusicEnabled, isSoundEnabled, setMusicEnabled, setSoundEnabled, setVolume } from '@/lib/sound';
import { useQuestDomain } from '@/context/quest-domain-store';
import { useGardenDomain } from '@/context/garden-domain-store';
import { useGardenTheme } from '@/context/garden-theme-store';
import { colors, spacing, typography } from '../../../constants/theme';

const SafeAreaView = styled(RNSafeAreaView);

const ON_OFF_OPTIONS = [
    { id: 'on' as const, label: 'On' },
    { id: 'off' as const, label: 'Off' },
];

const DAY_NIGHT_OPTIONS = [
    { id: 'day' as const, label: '☀️ Day' },
    { id: 'night' as const, label: '🌙 Night' },
];

function PreferenceLabel({ children }: { children: React.ReactNode }) {
    return (
        <Text
            style={{
                color: colors.foreground,
                fontSize: typography.label.fontSize,
                fontFamily: typography.label.fontFamily,
                marginBottom: 4,
            }}
        >
            {children}
        </Text>
    );
}

const Settings = () => {
    const { state: gardenState, resetGarden } = useGardenDomain();
    const { state: questState, resetQuests } = useQuestDomain();
    const { scheme, setScheme } = useGardenTheme();
    const { signOut } = useAuth();
    const { user } = useUser();
    // Mirrors sound.ts's module-level flags/value in local state purely so
    // these controls re-render — the getters below aren't reactive on their own.
    const [soundOn, setSoundOn] = useState(isSoundEnabled());
    const [musicOn, setMusicOn] = useState(isMusicEnabled());
    const [volume, setVolumeState] = useState(getVolume());

    const confirmReset = (title: string, message: string, onConfirm: () => void) => {
        Alert.alert(title, message, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Reset', style: 'destructive', onPress: onConfirm },
        ]);
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <ScrollView contentContainerStyle={{ padding: spacing[5], paddingBottom: spacing[24] }}>
                <ScreenHeader title="Settings" />

                <SectionHeading title="Account" />
                {user?.primaryEmailAddress && (
                    <Text
                        style={{
                            color: colors.mutedForeground,
                            fontSize: typography.body.fontSize,
                            fontFamily: typography.body.fontFamily,
                            marginBottom: spacing[3],
                        }}
                    >
                        Signed in as {user.primaryEmailAddress.emailAddress}
                    </Text>
                )}
                <Button
                    label="Sign Out"
                    variant="secondary"
                    onPress={() =>
                        Alert.alert('Sign out?', undefined, [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
                        ])
                    }
                />

                <SectionHeading title="Progress" />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] }}>
                    <StatPill label="points" value={gardenState.points} />
                    <StatPill label="earned" value={gardenState.totalPointsEarned} />
                    <StatPill label={`/ ${QUESTS.length} today`} value={completedTodayCount(questState)} />
                </View>
                <Text
                    style={{
                        color: colors.mutedForeground,
                        fontSize: typography.caption.fontSize,
                        fontFamily: typography.caption.fontFamily,
                        marginTop: spacing[2],
                    }}
                >
                    Garden and quest progress is saved on this device.
                </Text>

                <SectionHeading title="Preferences" />

                <PreferenceLabel>Sound Effects</PreferenceLabel>
                <ModeToggle
                    options={ON_OFF_OPTIONS}
                    selected={soundOn ? 'on' : 'off'}
                    onSelect={(id) => {
                        setSoundOn(id === 'on');
                        setSoundEnabled(id === 'on');
                    }}
                />
                <Text
                    style={{
                        color: colors.mutedForeground,
                        fontSize: typography.caption.fontSize,
                        fontFamily: typography.caption.fontFamily,
                        marginTop: -spacing[1],
                        marginBottom: spacing[4],
                    }}
                >
                    Plays a short sound when you place, remove, or complete a quest.
                </Text>

                <PreferenceLabel>Music</PreferenceLabel>
                <ModeToggle
                    options={ON_OFF_OPTIONS}
                    selected={musicOn ? 'on' : 'off'}
                    onSelect={(id) => {
                        setMusicOn(id === 'on');
                        setMusicEnabled(id === 'on');
                    }}
                />
                <Text
                    style={{
                        color: colors.mutedForeground,
                        fontSize: typography.caption.fontSize,
                        fontFamily: typography.caption.fontFamily,
                        marginTop: -spacing[1],
                        marginBottom: spacing[4],
                    }}
                >
                    A gentle ambient loop while you play.
                </Text>

                <PreferenceLabel>Volume — {Math.round(volume * 100)}%</PreferenceLabel>
                <Slider
                    style={{ marginHorizontal: 12, marginBottom: spacing[3] }}
                    minimumValue={0}
                    maximumValue={1}
                    step={0.05}
                    value={volume}
                    minimumTrackTintColor={colors.primary}
                    maximumTrackTintColor={colors.border}
                    thumbTintColor={colors.primary}
                    onValueChange={(v) => {
                        setVolumeState(v);
                        setVolume(v);
                    }}
                />

                <PreferenceLabel>Garden Background</PreferenceLabel>
                <ModeToggle options={DAY_NIGHT_OPTIONS} selected={scheme} onSelect={setScheme} />
                <Text
                    style={{
                        color: colors.mutedForeground,
                        fontSize: typography.caption.fontSize,
                        fontFamily: typography.caption.fontFamily,
                        marginTop: -spacing[1],
                        marginBottom: spacing[4],
                    }}
                >
                    Applies to both garden screens.
                </Text>

                <SectionHeading title="Danger Zone" />
                <View style={{ gap: spacing[3] }}>
                    <Button
                        label="Reset Garden"
                        variant="danger"
                        onPress={() =>
                            confirmReset(
                                'Reset garden?',
                                'This clears every placed decoration and your points. This can\'t be undone.',
                                resetGarden
                            )
                        }
                    />
                    <Button
                        label="Reset Today's Quests"
                        variant="danger"
                        onPress={() =>
                            confirmReset(
                                "Reset today's quests?",
                                "Quests already reset on their own every day — this just marks today's as incomplete again right now, so you can redo them without waiting for tomorrow.",
                                resetQuests
                            )
                        }
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}
export default Settings

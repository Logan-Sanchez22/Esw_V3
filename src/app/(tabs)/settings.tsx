import { Alert, ScrollView, Text, View } from 'react-native'
import React, { useState } from 'react'
import { styled } from "nativewind";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { useAuth, useUser } from "@clerk/expo";

import { Button, ScreenHeader, SectionHeading, StatPill } from '@/components/ui';
import { ModeToggle } from '@/components/ModeToggle';
import { completedTodayCount, QUESTS } from '@/lib/quest-domain';
import { isSoundEnabled, setSoundEnabled } from '@/lib/sound';
import { useQuestDomain } from '@/context/quest-domain-store';
import { useGardenDomain } from '@/context/garden-domain-store';
import { colors, spacing, typography } from '../../../constants/theme';

const SafeAreaView = styled(RNSafeAreaView);

const SOUND_OPTIONS = [
    { id: 'on' as const, label: 'On' },
    { id: 'off' as const, label: 'Off' },
];

const Settings = () => {
    const { state: gardenState, resetGarden } = useGardenDomain();
    const { state: questState, resetQuests } = useQuestDomain();
    const { signOut } = useAuth();
    const { user } = useUser();
    // Mirrors sound.ts's module-level flag in local state purely so this
    // toggle re-renders — isSoundEnabled() itself isn't reactive.
    const [soundOn, setSoundOn] = useState(isSoundEnabled());

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
                <ModeToggle
                    options={SOUND_OPTIONS}
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
                        marginBottom: spacing[3],
                    }}
                >
                    Plays a short sound when you place, remove, or complete a quest.
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

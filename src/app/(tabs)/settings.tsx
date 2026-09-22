import { Alert, ScrollView, Text, View } from 'react-native'
import React from 'react'
import { styled } from "nativewind";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { useAuth, useUser } from "@clerk/expo";

import { Button, ScreenHeader, SectionHeading, StatPill } from '@/components/ui';
import { QUESTS } from '@/lib/quest-domain';
import { useQuestDomain } from '@/context/quest-domain-store';
import { useGardenDomain } from '@/context/garden-domain-store';
import { colors, spacing, typography } from '../../../constants/theme';

const SafeAreaView = styled(RNSafeAreaView);

const Settings = () => {
    const { state: gardenState, resetGarden } = useGardenDomain();
    const { state: questState, resetQuests } = useQuestDomain();
    const { signOut } = useAuth();
    const { user } = useUser();

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
                    <StatPill label={`/ ${QUESTS.length} quests`} value={questState.completedQuestIds.length} />
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
                        label="Reset Quests"
                        variant="danger"
                        onPress={() =>
                            confirmReset(
                                'Reset quests?',
                                'This marks every quest as incomplete again, so you can redo them for points.',
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

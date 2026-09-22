import { ScrollView, Text, View } from 'react-native'
import React from 'react'
import { styled } from "nativewind";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

import { Button, Card, EmptyState, ScreenHeader, StatPill } from '@/components/ui';
import { QUESTS } from '@/lib/quest-domain';
import { useQuestDomain } from '@/context/quest-domain-store';
import { useGardenDomain } from '@/context/garden-domain-store';
import { colors, spacing, typography } from '../../../constants/theme';

const SafeAreaView = styled(RNSafeAreaView);

const QuestPage = () => {
    const { isCompleted, completeQuest } = useQuestDomain();
    const { state: gardenState, addPoints } = useGardenDomain();

    const allComplete = QUESTS.every((quest) => isCompleted(quest.id));

    return (
        <SafeAreaView className="flex-1 bg-background">
            <View style={{ padding: spacing[5], paddingBottom: spacing[2] }}>
                <ScreenHeader title="Quests" />
                <StatPill label="points" value={gardenState.points} />
            </View>

            {allComplete ? (
                <EmptyState
                    icon={<Text style={{ fontSize: 32 }}>🌿</Text>}
                    title="All done for today!"
                    message="Nice work — you've finished every quest for today. They'll be back tomorrow for more points."
                />
            ) : (
                <ScrollView contentContainerStyle={{ padding: spacing[5], paddingTop: spacing[2], gap: spacing[3] }}>
                    {QUESTS.map((quest) => {
                        const completed = isCompleted(quest.id);

                        return (
                            <View key={quest.id} style={{ opacity: completed ? 0.6 : 1 }}>
                                <Card>
                                    <Text
                                        style={{
                                            color: colors.foreground,
                                            fontSize: typography.title.fontSize,
                                            fontFamily: typography.title.fontFamily,
                                            marginBottom: 4,
                                        }}
                                    >
                                        {quest.title}
                                    </Text>
                                    <Text
                                        style={{
                                            color: colors.mutedForeground,
                                            fontSize: typography.body.fontSize,
                                            fontFamily: typography.body.fontFamily,
                                            marginBottom: spacing[3],
                                        }}
                                    >
                                        {quest.description}
                                    </Text>

                                    {completed ? (
                                        // A quiet, non-button row instead of a dimmed Button — a
                                        // disabled button still looks like an action waiting to be
                                        // taken; this reads unambiguously as "nothing to do here,"
                                        // so it doesn't compete with whatever's still actionable
                                        // elsewhere on the screen.
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Text
                                                style={{
                                                    color: colors.mutedForeground,
                                                    fontSize: typography.label.fontSize,
                                                    fontFamily: typography.label.fontFamily,
                                                }}
                                            >
                                                ✓ Completed today
                                            </Text>
                                        </View>
                                    ) : (
                                        <Button
                                            label={`Complete (+${quest.points} pts)`}
                                            onPress={() => {
                                                completeQuest(quest.id);
                                                addPoints(quest.points);
                                            }}
                                        />
                                    )}
                                </Card>
                            </View>
                        );
                    })}
                </ScrollView>
            )}
        </SafeAreaView>
    )
}
export default QuestPage

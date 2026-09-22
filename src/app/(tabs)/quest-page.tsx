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
                    title="All quests complete!"
                    message="Nice work — you've finished every quest. Check back soon for more."
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

                                    <Button
                                        label={completed ? 'Completed ✓' : `Complete (+${quest.points} pts)`}
                                        disabled={completed}
                                        onPress={() => {
                                            completeQuest(quest.id);
                                            addPoints(quest.points);
                                        }}
                                    />
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

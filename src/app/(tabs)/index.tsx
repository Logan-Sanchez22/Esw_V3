import "@/global.css"
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { styled } from "nativewind";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { useUser } from "@clerk/expo";

import { Button, Card, EmptyState, ScreenHeader, SectionHeading, StatPill } from '@/components/ui';
import { useGardenDomain } from '@/context/garden-domain-store';
import { useQuestDomain } from '@/context/quest-domain-store';
import { QUESTS } from '@/lib/quest-domain';
import { colors, spacing, typography } from '../../../constants/theme';

const SafeAreaView = styled(RNSafeAreaView);

export default function Home() {
    const { user } = useUser();
    const { state: gardenState } = useGardenDomain();
    const { state: questState, isCompleted } = useQuestDomain();

    const completedCount = questState.completedQuestIds.length;
    const nextQuest = QUESTS.find((quest) => !isCompleted(quest.id));
    const firstName = user?.firstName ?? user?.primaryEmailAddress?.emailAddress?.split('@')[0] ?? 'there';

    return (
        <SafeAreaView className="flex-1 bg-background">
            <ScrollView contentContainerStyle={{ padding: spacing[5], paddingBottom: spacing[24] }}>
                <ScreenHeader title={`Welcome back, ${firstName}`} subtitle="Here's how your garden is growing." />

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3], marginBottom: spacing[2] }}>
                    <StatPill label="points" value={gardenState.points} />
                    <StatPill label="earned" value={gardenState.totalPointsEarned} />
                    <StatPill label={`/ ${QUESTS.length} quests`} value={completedCount} />
                </View>

                <SectionHeading title="Your Gardens" />
                <View style={{ gap: spacing[3] }}>
                    <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/garden')}>
                        <Card elevated>
                            <Text style={{ color: colors.foreground, fontSize: typography.title.fontSize, fontFamily: typography.title.fontFamily, marginBottom: 4 }}>
                                🌳 Isometric Garden
                            </Text>
                            <Text style={{ color: colors.mutedForeground, fontSize: typography.body.fontSize, fontFamily: typography.body.fontFamily }}>
                                Plant, paint, and arrange your garden in 3D.
                            </Text>
                        </Card>
                    </TouchableOpacity>

                    <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/garden-alt')}>
                        <Card elevated>
                            <Text style={{ color: colors.foreground, fontSize: typography.title.fontSize, fontFamily: typography.title.fontFamily, marginBottom: 4 }}>
                                🧭 Top-Down Garden
                            </Text>
                            <Text style={{ color: colors.mutedForeground, fontSize: typography.body.fontSize, fontFamily: typography.body.fontFamily }}>
                                The same garden, viewed from directly above.
                            </Text>
                        </Card>
                    </TouchableOpacity>
                </View>

                <SectionHeading title="Quests" />
                {nextQuest ? (
                    <Card>
                        <Text style={{ color: colors.foreground, fontSize: typography.title.fontSize, fontFamily: typography.title.fontFamily, marginBottom: 4 }}>
                            {nextQuest.title}
                        </Text>
                        <Text style={{ color: colors.mutedForeground, fontSize: typography.body.fontSize, fontFamily: typography.body.fontFamily, marginBottom: spacing[3] }}>
                            {nextQuest.description}
                        </Text>
                        <Button label={`+${nextQuest.points} pts — Go to Quests`} onPress={() => router.push('/quest-page')} />
                    </Card>
                ) : (
                    <EmptyState
                        icon={<Text style={{ fontSize: 32 }}>🌿</Text>}
                        title="All quests complete!"
                        message="You've finished every quest — nice work. Check back soon for more."
                        actionLabel="View Quests"
                        onAction={() => router.push('/quest-page')}
                    />
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

import { ScrollView, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'
import { styled } from "nativewind";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

import { QUESTS } from '@/lib/quest-domain';
import { useQuestDomain } from '@/context/quest-domain-store';
import { useGardenDomain } from '@/context/garden-domain-store';

const SafeAreaView = styled(RNSafeAreaView);

const QuestPage = () => {
    const { isCompleted, completeQuest } = useQuestDomain();
    const { state: gardenState, addPoints } = useGardenDomain();

    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="p-5 pb-2">
                <Text className="text-xl font-bold text-success mb-2">Quests</Text>
                <Text className="text-mutedForeground">{gardenState.points} pts</Text>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 12 }}>
                {QUESTS.map((quest) => {
                    const completed = isCompleted(quest.id);

                    return (
                        <View
                            key={quest.id}
                            style={{
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: '#065F46',
                                backgroundColor: '#061A10',
                                padding: 14,
                                opacity: completed ? 0.6 : 1,
                            }}
                        >
                            <Text style={{ color: '#ECFDF5', fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>
                                {quest.title}
                            </Text>
                            <Text style={{ color: '#6EE7B7', marginBottom: 10 }}>{quest.description}</Text>

                            <TouchableOpacity
                                disabled={completed}
                                onPress={() => {
                                    completeQuest(quest.id);
                                    addPoints(quest.points);
                                }}
                                style={{
                                    alignSelf: 'flex-start',
                                    backgroundColor: completed ? '#064E3B' : '#34D399',
                                    paddingVertical: 8,
                                    paddingHorizontal: 14,
                                    borderRadius: 8,
                                }}
                            >
                                <Text style={{ color: completed ? '#6EE7B7' : '#020F09', fontWeight: '600' }}>
                                    {completed ? 'Completed ✓' : `Complete (+${quest.points} pts)`}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    );
                })}
            </ScrollView>
        </SafeAreaView>
    )
}
export default QuestPage

import { Alert, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'
import { styled } from "nativewind";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

import { QUESTS } from '@/lib/quest-domain';
import { useQuestDomain } from '@/context/quest-domain-store';
import { useGardenDomain } from '@/context/garden-domain-store';

const SafeAreaView = styled(RNSafeAreaView);

const DangerButton = ({ label, onPress }: { label: string; onPress: () => void }) => (
    <TouchableOpacity
        onPress={onPress}
        style={{
            borderRadius: 10,
            borderWidth: 1,
            borderColor: '#7f1d1d',
            backgroundColor: '#450a0a',
            paddingVertical: 12,
            paddingHorizontal: 16,
            marginBottom: 12,
        }}
    >
        <Text style={{ color: '#fca5a5', fontWeight: '600' }}>{label}</Text>
    </TouchableOpacity>
);

const Settings = () => {
    const { state: gardenState, resetGarden } = useGardenDomain();
    const { state: questState, resetQuests } = useQuestDomain();

    const confirmReset = (title: string, message: string, onConfirm: () => void) => {
        Alert.alert(title, message, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Reset', style: 'destructive', onPress: onConfirm },
        ]);
    };

    return (
        <SafeAreaView className="flex-1 bg-background p-5">
            <Text className="text-xl font-bold text-success mb-6">Settings</Text>

            <Text className="text-mutedForeground mb-1">
                {gardenState.points} pts · {questState.completedQuestIds.length}/{QUESTS.length} quests completed
            </Text>
            <Text className="text-mutedForeground mb-6">
                Garden and quest progress is saved on this device.
            </Text>

            <View>
                <DangerButton
                    label="Reset Garden"
                    onPress={() =>
                        confirmReset(
                            'Reset garden?',
                            'This clears every placed decoration and your points. This can\'t be undone.',
                            resetGarden
                        )
                    }
                />
                <DangerButton
                    label="Reset Quests"
                    onPress={() =>
                        confirmReset(
                            'Reset quests?',
                            'This marks every quest as incomplete again, so you can redo them for points.',
                            resetQuests
                        )
                    }
                />
            </View>
        </SafeAreaView>
    )
}
export default Settings

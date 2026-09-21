import { Text, TouchableOpacity, View } from 'react-native';

/**
 * Small segmented control — "what does tapping a tile do right now."
 * Plain UI like ItemPicker, so shared between both garden screens.
 */
export type ModeOption<T extends string> = {
    id: T;
    label: string;
};

type Props<T extends string> = {
    options: ModeOption<T>[];
    selected: T;
    onSelect: (id: T) => void;
};

export function ModeToggle<T extends string>({ options, selected, onSelect }: Props<T>) {
    return (
        <View style={{ flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 8 }}>
            {options.map((option) => {
                const active = option.id === selected;

                return (
                    <TouchableOpacity
                        key={option.id}
                        onPress={() => onSelect(option.id)}
                        style={{
                            paddingVertical: 6,
                            paddingHorizontal: 14,
                            borderRadius: 999,
                            backgroundColor: active ? '#34D399' : 'rgba(255,255,255,0.1)',
                        }}
                    >
                        <Text style={{ color: active ? '#020F09' : 'white', fontWeight: '600', fontSize: 12 }}>
                            {option.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

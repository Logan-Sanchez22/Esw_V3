import { Text, TouchableOpacity, View } from 'react-native';

import { colors } from '../../constants/theme';

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
    /** Active-pill background, defaults to colors.primary (the mode toggle's
     * original color). A second toggle row reusing this same component right
     * above/below the first one (e.g. the decoration picker's category
     * filter) needs a different active color, or the two rows read as
     * confusing duplicates of the same control rather than two distinct
     * selectors — colors.highlight is the deliberate choice there, tying the
     * filter's active color to the same yellow already meaning "selected"
     * on the picker's own cards, not an arbitrary new value. */
    activeColor?: string;
};

export function ModeToggle<T extends string>({ options, selected, onSelect, activeColor = colors.primary }: Props<T>) {
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
                            backgroundColor: active ? activeColor : 'rgba(255,255,255,0.1)',
                        }}
                    >
                        <Text style={{ color: active ? colors.background : 'white', fontWeight: '600', fontSize: 12 }}>
                            {option.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

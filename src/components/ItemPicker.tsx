import { ReactNode } from 'react';
import { ScrollView, Text, TouchableOpacity } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

/**
 * Generic "what am I about to place" bar — a horizontal row of tappable
 * catalog items. This is plain UI (no isometric/top-down positioning math),
 * so unlike IsometricGrid/PannableGrid it's fine for both garden screens to
 * share it; each screen just hands it its own icon per item.
 */
export type PickerEntry = {
    id: string;
    label: string;
    cost: number;
    icon: ReactNode;
};

type Props = {
    items: PickerEntry[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    points: number;
};

// Its own component (not inlined in the .map() below) because it needs its
// own useSharedValue per item — hooks can't be called from inside a callback.
function PickerItemButton({
    item,
    selected,
    affordable,
    onPress,
}: {
    item: PickerEntry;
    selected: boolean;
    affordable: boolean;
    onPress: () => void;
}) {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

    return (
        <Animated.View style={animatedStyle}>
            <TouchableOpacity
                disabled={!affordable}
                onPress={onPress}
                onPressIn={() => {
                    scale.value = withTiming(0.92, { duration: 80 });
                }}
                onPressOut={() => {
                    scale.value = withTiming(1, { duration: 120 });
                }}
                style={{
                    alignItems: 'center',
                    width: 64,
                    borderRadius: 10,
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected ? '#facc15' : 'rgba(255,255,255,0.15)',
                    backgroundColor: 'rgba(0,0,0,0.25)',
                    opacity: affordable ? 1 : 0.4,
                    paddingVertical: 8,
                }}
            >
                {item.icon}
                <Text numberOfLines={1} style={{ fontSize: 10, color: 'white', marginTop: 4 }}>
                    {item.label}
                </Text>
                <Text style={{ fontSize: 10, color: '#facc15', marginTop: 2 }}>
                    {item.cost > 0 ? `${item.cost} pts` : 'Free'}
                </Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

export function ItemPicker({ items, selectedId, onSelect, points }: Props) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
            style={{ flexGrow: 0 }}
        >
            {items.map((item) => (
                <PickerItemButton
                    key={item.id}
                    item={item}
                    selected={item.id === selectedId}
                    affordable={points >= item.cost}
                    onPress={() => onSelect(item.id)}
                />
            ))}
        </ScrollView>
    );
}

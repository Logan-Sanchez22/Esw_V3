import { ReactNode } from 'react';
import { ScrollView, Text, TouchableOpacity } from 'react-native';

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

export function ItemPicker({ items, selectedId, onSelect, points }: Props) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
            style={{ flexGrow: 0 }}
        >
            {items.map((item) => {
                const affordable = points >= item.cost;
                const selected = item.id === selectedId;

                return (
                    <TouchableOpacity
                        key={item.id}
                        disabled={!affordable}
                        onPress={() => onSelect(item.id)}
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
                );
            })}
        </ScrollView>
    );
}

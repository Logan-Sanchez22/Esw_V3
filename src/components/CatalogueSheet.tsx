import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { colors, spacing, typography } from '../../constants/theme';
import { PickerEntry } from './ItemPicker';

/**
 * "See everything at once" browse view for the decoration catalog — a
 * bottom sheet over the current garden screen, not a new screen/tab (per
 * the roadmap's explicit "don't add a navigation destination for this
 * yet"). Complements ItemPicker's horizontal row rather than replacing it:
 * the row stays the fast, always-visible path for a few items or one
 * category; this is for "let me just see the whole catalog." Same
 * PickerEntry shape and the same selected/locked/cost visual language as
 * ItemPicker's own cards — a small, deliberately duplicated card style
 * (not a shared component) since ItemPicker's card is a private,
 * already-working implementation detail not worth refactoring open for a
 * one-off modal.
 */
type Props = {
    visible: boolean;
    items: PickerEntry[];
    selectedId: string | null;
    points: number;
    onSelect: (id: string) => void;
    onClose: () => void;
};

export function CatalogueSheet({ visible, items, selectedId, points, onSelect, onClose }: Props) {
    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
                <View
                    style={{
                        backgroundColor: colors.card,
                        borderTopLeftRadius: 16,
                        borderTopRightRadius: 16,
                        maxHeight: '75%',
                        padding: spacing[4],
                    }}
                >
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: spacing[3],
                        }}
                    >
                        <Text
                            style={{
                                color: colors.foreground,
                                fontSize: typography.title.fontSize,
                                fontFamily: typography.title.fontFamily,
                            }}
                        >
                            All Decorations
                        </Text>
                        <TouchableOpacity onPress={onClose} hitSlop={10} style={{ padding: 6 }}>
                            <Text style={{ color: colors.mutedForeground, fontSize: 18 }}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: spacing[4] }}>
                        {items.map((item) => {
                            const selected = item.id === selectedId;
                            const locked = item.locked ?? false;
                            const affordable = points >= item.cost;

                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    disabled={locked || !affordable}
                                    onPress={() => {
                                        onSelect(item.id);
                                        onClose();
                                    }}
                                    style={{
                                        width: 76,
                                        alignItems: 'center',
                                        borderRadius: 10,
                                        borderWidth: selected ? 2 : 1,
                                        borderColor: selected ? colors.highlight : 'rgba(255,255,255,0.15)',
                                        backgroundColor: selected ? 'rgba(250,204,21,0.12)' : 'rgba(0,0,0,0.25)',
                                        opacity: locked ? 0.5 : affordable ? 1 : 0.4,
                                        paddingVertical: 8,
                                    }}
                                >
                                    {item.icon}
                                    <Text numberOfLines={1} style={{ fontSize: 10, color: 'white', marginTop: 4 }}>
                                        {item.label}
                                    </Text>
                                    {item.sizeLabel && (
                                        <Text style={{ fontSize: 8, color: colors.mutedForeground, marginTop: 1 }}>
                                            {item.sizeLabel}
                                        </Text>
                                    )}
                                    {locked ? (
                                        <Text
                                            numberOfLines={2}
                                            style={{ fontSize: 9, color: '#9ca3af', marginTop: 2, textAlign: 'center' }}
                                        >
                                            🔒 {item.lockedHint ?? 'Locked'}
                                        </Text>
                                    ) : (
                                        <Text style={{ fontSize: 10, color: colors.highlight, marginTop: 2 }}>
                                            {item.cost > 0 ? `${item.cost} pts` : 'Free'}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

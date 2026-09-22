import { Text, TouchableOpacity, View } from 'react-native';

/**
 * Floating pill shown while a decoration placement is pending — the ghost
 * preview on the tile shows *where*, this shows *what* and lets you commit
 * or back out. Plain UI like ItemPicker/ModeToggle, so shared by both
 * garden screens; each positions it itself (absolute, above its own tab-bar
 * spacing) since that math differs per screen.
 */
type Props = {
    itemLabel: string;
    /** Distance from the bottom of the nearest positioned ancestor — differs
     * per screen depending on how much tab-bar space that screen reserves. */
    bottom: number;
    /** "{actionLabel} {itemLabel} here?" — defaults to "Place"; interact
     * mode's move flow reuses this same bar with "Move" instead, since the
     * confirm/cancel-a-pending-tile shape is identical either way. */
    actionLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
};

export function PlacementConfirmBar({ itemLabel, bottom, actionLabel = 'Place', onConfirm, onCancel }: Props) {
    return (
        <View
            style={{
                position: 'absolute',
                bottom,
                alignSelf: 'center',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                backgroundColor: 'rgba(0,0,0,0.75)',
                borderRadius: 999,
                paddingVertical: 8,
                paddingHorizontal: 14,
            }}
        >
            <Text style={{ color: 'white', fontSize: 13 }}>{actionLabel} {itemLabel} here?</Text>
            <TouchableOpacity
                onPress={onCancel}
                style={{
                    paddingVertical: 6,
                    paddingHorizontal: 14,
                    borderRadius: 999,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                }}
            >
                <Text style={{ color: 'white', fontWeight: '600' }}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity
                onPress={onConfirm}
                style={{
                    paddingVertical: 6,
                    paddingHorizontal: 14,
                    borderRadius: 999,
                    backgroundColor: '#34D399',
                }}
            >
                <Text style={{ color: '#020F09', fontWeight: '700' }}>✓ Confirm</Text>
            </TouchableOpacity>
        </View>
    );
}

import { Text, TouchableOpacity, View } from 'react-native';

import { colors } from '../../constants/theme';

/**
 * Floating pill shown when a placed decoration is selected in Interact
 * mode — names it and offers Move. Distinct from PlacementConfirmBar:
 * that one confirms/cancels a *pending* action on an empty tile, this one
 * inspects something that's already really there. Plain UI, shared by both
 * garden screens; each positions it itself (absolute, above its own
 * tab-bar spacing) since that math differs per screen.
 */
type Props = {
    itemLabel: string;
    bottom: number;
    onMove: () => void;
    onClose: () => void;
};

export function DecorationInfoCard({ itemLabel, bottom, onMove, onClose }: Props) {
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
            <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>{itemLabel}</Text>
            <TouchableOpacity
                onPress={onClose}
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
                onPress={onMove}
                style={{
                    paddingVertical: 6,
                    paddingHorizontal: 14,
                    borderRadius: 999,
                    backgroundColor: colors.info,
                }}
            >
                <Text style={{ color: colors.background, fontWeight: '700' }}>↔ Move</Text>
            </TouchableOpacity>
        </View>
    );
}

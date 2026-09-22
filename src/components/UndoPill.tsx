import { Text, TouchableOpacity } from 'react-native';

import { getCatalogItem, UndoableAction } from '@/lib/garden-domain';
import { colors, typography } from '../../constants/theme';

/**
 * Small "take that back" affordance shown whenever there's a single most
 * recent place/move/remove to reverse — see UndoableAction/undoAction in
 * garden-domain.ts and the (in-memory only, not persisted) lastAction state
 * in garden-domain-store.tsx. Shared by both garden screens so the label
 * phrasing and look can't drift between them.
 */
function describeAction(action: UndoableAction): string {
    const itemLabel = getCatalogItem(action.itemId)?.label ?? 'item';
    switch (action.kind) {
        case 'place':
            return `Undo placing ${itemLabel}`;
        case 'move':
            return `Undo moving ${itemLabel}`;
        case 'remove':
            return `Undo removing ${itemLabel}`;
    }
}

type Props = {
    action: UndoableAction;
    onPress: () => void;
};

export function UndoPill({ action, onPress }: Props) {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={{
                alignSelf: 'flex-start',
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.info,
                borderRadius: 999,
                paddingVertical: 6,
                paddingHorizontal: 14,
                marginTop: 8,
            }}
        >
            <Text style={{ color: colors.info, fontSize: typography.label.fontSize, fontFamily: typography.label.fontFamily }}>
                ↺ {describeAction(action)}
            </Text>
        </TouchableOpacity>
    );
}

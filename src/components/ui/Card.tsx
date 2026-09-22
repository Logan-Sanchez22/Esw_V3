import { ReactNode } from 'react';
import { View } from 'react-native';

import { colors, shadow, spacing } from '../../../constants/theme';

/**
 * The one card container every screen should use — replaces the bespoke
 * bordered/backgrounded View that the quest list and settings screens each
 * hand-wrote separately with the same values.
 */
type Props = {
    children: ReactNode;
    /** Adds the shared "raised" shadow — use sparingly (stat cards), not on every list row. */
    elevated?: boolean;
};

export function Card({ children, elevated }: Props) {
    return (
        <View
            style={[
                {
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.card,
                    padding: spacing[4],
                },
                elevated ? shadow : undefined,
            ]}
        >
            {children}
        </View>
    );
}

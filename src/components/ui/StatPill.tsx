import { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { colors, typography } from '../../../constants/theme';

/**
 * Replaces the plain `{points} pts · {earned} earned` text rows on both
 * garden screens and Settings with a visual pill — same information, more
 * legible at a glance, and reusable on Home's new stat row.
 */
type Props = {
    label: string;
    value: string | number;
    icon?: ReactNode;
};

export function StatPill({ label, value, icon }: Props) {
    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 999,
                paddingVertical: 8,
                paddingHorizontal: 14,
            }}
        >
            {icon}
            <Text style={{ color: colors.foreground, fontSize: typography.label.fontSize, fontFamily: typography.label.fontFamily }}>
                {value}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: typography.caption.fontSize, fontFamily: typography.caption.fontFamily }}>
                {label}
            </Text>
        </View>
    );
}

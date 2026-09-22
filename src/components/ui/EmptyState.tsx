import { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { colors, spacing, typography } from '../../../constants/theme';
import { Button } from './Button';

/**
 * A placeholder for "nothing here yet" — every quest done, no garden
 * activity, etc. Nothing in the app used this before; screens just rendered
 * an empty or all-dimmed list, which reads as broken rather than complete.
 */
type Props = {
    icon: ReactNode;
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
};

export function EmptyState({ icon, title, message, actionLabel, onAction }: Props) {
    return (
        <View style={{ alignItems: 'center', paddingVertical: spacing[8], paddingHorizontal: spacing[5] }}>
            <View style={{ marginBottom: spacing[3] }}>{icon}</View>
            <Text
                style={{
                    color: colors.foreground,
                    fontSize: typography.title.fontSize,
                    fontFamily: typography.title.fontFamily,
                    marginBottom: 6,
                    textAlign: 'center',
                }}
            >
                {title}
            </Text>
            <Text
                style={{
                    color: colors.mutedForeground,
                    fontSize: typography.body.fontSize,
                    fontFamily: typography.body.fontFamily,
                    textAlign: 'center',
                    marginBottom: actionLabel ? spacing[4] : 0,
                }}
            >
                {message}
            </Text>
            {actionLabel && onAction && <Button label={actionLabel} onPress={onAction} variant="secondary" />}
        </View>
    );
}

import { Text, View } from 'react-native';

import { colors, spacing, typography } from '../../../constants/theme';

/**
 * Replaces the repeated `<Text className="text-xl font-bold text-success mb-2">`
 * pattern hand-written at the top of Garden/Quests/Settings.
 */
type Props = {
    title: string;
    subtitle?: string;
};

export function ScreenHeader({ title, subtitle }: Props) {
    return (
        <View style={{ marginBottom: spacing[4] }}>
            <Text style={{ color: colors.success, fontSize: typography.display.fontSize, fontFamily: typography.display.fontFamily }}>
                {title}
            </Text>
            {subtitle && (
                <Text
                    style={{
                        color: colors.mutedForeground,
                        fontSize: typography.body.fontSize,
                        fontFamily: typography.body.fontFamily,
                        marginTop: 4,
                    }}
                >
                    {subtitle}
                </Text>
            )}
        </View>
    );
}

import { Text, TextInput, TextInputProps, View } from 'react-native';

import { colors, spacing, typography } from '../../../constants/theme';

/**
 * Replaces the `inputStyle` object copy-pasted verbatim between sign-in.tsx
 * and sign-up.tsx, plus adds an optional label/error slot neither screen had
 * room for cleanly before.
 */
type Props = TextInputProps & {
    label?: string;
    error?: string;
};

export function TextField({ label, error, style, ...inputProps }: Props) {
    return (
        <View style={{ marginBottom: spacing[2] }}>
            {label && (
                <Text style={{ color: colors.mutedForeground, fontSize: typography.caption.fontSize, fontFamily: typography.caption.fontFamily, marginBottom: 4 }}>
                    {label}
                </Text>
            )}
            <TextInput
                placeholderTextColor={colors.mutedForeground}
                style={[
                    {
                        borderWidth: 1,
                        borderColor: error ? colors.danger : colors.border,
                        borderRadius: 8,
                        padding: 12,
                        color: colors.foreground,
                        fontFamily: typography.body.fontFamily,
                        fontSize: typography.body.fontSize,
                    },
                    style,
                ]}
                {...inputProps}
            />
            {error && (
                <Text style={{ color: colors.warning, fontSize: typography.caption.fontSize, marginTop: 4 }}>{error}</Text>
            )}
        </View>
    );
}

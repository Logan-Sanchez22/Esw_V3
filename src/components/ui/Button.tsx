import { ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { colors, typography } from '../../../constants/theme';

/**
 * The one button every screen should use from here on — replaces the
 * near-identical TouchableOpacity blocks hand-written per screen (sign-in,
 * sign-up, quests, settings all had their own copy). Press-scale animation
 * matches ItemPicker's PickerItemButton (0.92 in / back to 1 out) so button
 * feel is consistent with the garden screens' already-proven motion.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'danger';

type Props = {
    label: string;
    onPress: () => void;
    variant?: ButtonVariant;
    disabled?: boolean;
    loading?: boolean;
};

const VARIANT_STYLES: Record<ButtonVariant, { background: string; borderColor?: string; textColor: string }> = {
    primary: { background: colors.primary, textColor: colors.background },
    secondary: {
        background: 'rgba(255,255,255,0.05)',
        borderColor: 'rgba(255,255,255,0.15)',
        textColor: colors.foreground,
    },
    danger: {
        background: 'rgba(248,113,113,0.12)',
        borderColor: 'rgba(248,113,113,0.4)',
        textColor: colors.danger,
    },
};

export function Button({ label, onPress, variant = 'primary', disabled, loading }: Props) {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
    const isDisabled = disabled || loading;
    const { background, borderColor, textColor } = VARIANT_STYLES[variant];

    return (
        <Animated.View style={animatedStyle}>
            <TouchableOpacity
                disabled={isDisabled}
                onPress={onPress}
                onPressIn={() => {
                    scale.value = withTiming(0.96, { duration: 80 });
                }}
                onPressOut={() => {
                    scale.value = withTiming(1, { duration: 120 });
                }}
                style={{
                    backgroundColor: background,
                    borderWidth: borderColor ? 1 : 0,
                    borderColor,
                    borderRadius: 10,
                    paddingVertical: 14,
                    paddingHorizontal: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: isDisabled ? 0.5 : 1,
                }}
            >
                {loading ? (
                    <ActivityIndicator color={textColor} />
                ) : (
                    <Text style={{ color: textColor, fontSize: typography.label.fontSize, fontFamily: typography.label.fontFamily }}>
                        {label}
                    </Text>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
}

import { Text } from 'react-native';

import { colors, spacing, typography } from '../../../constants/theme';

/** Groups a screen into labeled sections — e.g. Settings' Account / Progress / Danger Zone. */
type Props = {
    title: string;
};

export function SectionHeading({ title }: Props) {
    return (
        <Text
            style={{
                color: colors.mutedForeground,
                fontSize: typography.caption.fontSize,
                fontFamily: typography.label.fontFamily,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: spacing[2],
                marginTop: spacing[5],
            }}
        >
            {title}
        </Text>
    );
}

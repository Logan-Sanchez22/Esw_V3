import { View } from 'react-native';

/**
 * A flat soft-shadow ellipse under a placed decoration — pure CSS/View, no
 * art asset needed. Shared by both garden screens so trees/bushes/etc. read
 * as sitting ON the ground instead of floating on it.
 */
type Props = { size: number };

export function DecorationShadow({ size }: Props) {
    return (
        <View
            pointerEvents="none"
            style={{
                position: 'absolute',
                bottom: 0,
                alignSelf: 'center',
                width: size * 0.7,
                height: size * 0.22,
                borderRadius: size * 0.35,
                backgroundColor: 'rgba(0,0,0,0.28)',
            }}
        />
    );
}

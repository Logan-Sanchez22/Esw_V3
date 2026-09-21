import { Text, View } from 'react-native';

type Props = { size: number };

/**
 * Fallback for a tile whose planted item has no art on THIS screen — e.g. a
 * top-down-only item (lilyPad, grassTuft) viewed from the iso screen, or an
 * iso-only item (bench) viewed from top-down. Garden state is shared between
 * both screens, so without this a tile could look occupied on one screen and
 * silently empty on the other — this keeps both screens honest about the
 * same underlying garden even where their art coverage doesn't match yet.
 */
export function UnknownItemMarker({ size }: Props) {
    return (
        <View
            style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: 'rgba(0,0,0,0.55)',
                borderWidth: 1,
                borderColor: '#facc15',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Text style={{ fontSize: size * 0.55, color: '#facc15' }}>✦</Text>
        </View>
    );
}

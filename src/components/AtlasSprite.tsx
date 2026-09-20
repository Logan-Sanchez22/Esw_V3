import { Image } from 'expo-image';
import { View } from 'react-native';

import type { SpriteAtlas, SpriteRect } from '@/lib/sprite-atlas-types';

type Props<Key extends string> = {
    atlas: SpriteAtlas<Key>;
    sprite: Key;
    /** Rendered box size on screen (both dimensions when fit="stretch"; the longer
     dimension when fit="contain"). Defaults to the sprite's native pixel size. */
    size?: number;
    /**
     * 'contain' (default) preserves the sprite's aspect ratio — use for decorations
     * (trees, props) so tall/wide art doesn't distort.
     * 'stretch' forces an exact size x size box regardless of the source rect's
     * aspect ratio — use for GROUND TILES, since real tileset sheets are rarely
     * padded to perfect squares (a 30x27 tile must still fill a 32x32 cell with
     * no gap, or seamless tiling breaks).
     */
    fit?: 'contain' | 'stretch';
    style?: any;
};

export function AtlasSprite<Key extends string>({
                                                    atlas,
                                                    sprite,
                                                    size,
                                                    fit = 'contain',
                                                    style,
                                                }: Props<Key>) {
    const rect: SpriteRect = atlas.sprites[sprite];

    const scaleX = size ? (fit === 'stretch' ? size / rect.width : size / Math.max(rect.width, rect.height)) : 1;
    const scaleY = size ? (fit === 'stretch' ? size / rect.height : size / Math.max(rect.width, rect.height)) : 1;

    const boxWidth = rect.width * scaleX;
    const boxHeight = rect.height * scaleY;

    return (
        <View style={[{ width: boxWidth, height: boxHeight, overflow: 'hidden' }, style]}>
            <Image
                source={atlas.source}
                style={{
                    position: 'absolute',
                    left: -rect.x * scaleX,
                    top: -rect.y * scaleY,
                    width: atlas.sheetWidth * scaleX,
                    height: atlas.sheetHeight * scaleY,
                }}
                contentFit="fill"
            />
        </View>
    );
}
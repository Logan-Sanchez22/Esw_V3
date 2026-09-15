import type { SpriteAtlas } from '@/lib/sprite-atlas-types';

/**
 * Curated starter set from misc.png — the items that actually matter for
 * gameplay (things a player plants/places). This is NOT all 98 sprites on
 * the sheet; it's the ones identified against the labeled reference image
 * (see /assets/reference/misc_labeled.png). To add more:
 *   1. Open misc_labeled.png, find the numbered box for the sprite you want
 *   2. Look up that index's [x, y, w, h] in misc_boxes.json
 *   3. Add a new entry below following the same pattern
 * This keeps growing the catalog a one-line change, never a rewrite.
 */
export type IsoDecorationKey =
    | 'treeFullGrown'
    | 'treeBare'
    | 'gardenBedEmpty1'
    | 'gardenBedEmpty2'
    | 'bushRound1'
    | 'bushRound2'
    | 'mushroomRed'
    | 'benchWood';

export const isoDecorationAtlas: SpriteAtlas<IsoDecorationKey> = {
    source: require('@/assets/images/garden/misc.png'),
    sheetWidth: 323,
    sheetHeight: 310,
    sprites: {
        treeFullGrown: { x: 100, y: 164, width: 105, height: 128 },
        treeBare: { x: 206, y: 175, width: 99, height: 115 },
        gardenBedEmpty1: { x: 79, y: 134, width: 47, height: 32 },
        gardenBedEmpty2: { x: 155, y: 126, width: 47, height: 32 },
        bushRound1: { x: 234, y: 87, width: 36, height: 36 },
        bushRound2: { x: 282, y: 89, width: 35, height: 36 },
        mushroomRed: { x: 240, y: 127, width: 14, height: 16 },
        benchWood: { x: 57, y: 47, width: 20, height: 28 },
    },
};
import type { SpriteAtlas } from '@/lib/sprite-atlas-types';

/**
 * Extracted from misc.png against the labeled reference image
 * (assets/images/measured/misc_labeled.png). Coordinates here were found by
 * connected-component detection on that reference's red boxes (see the
 * garden-system handoff's debugging playbook) rather than eyeballed, then
 * confirmed by visually cropping each rect out of the real sheet. Still not
 * all ~98 sprites on the sheet — a curated set useful for planting/placing.
 * To add more: crop a candidate rect out of misc.png and confirm it visually
 * before trusting it, same as these were.
 */
export type IsoDecorationKey =
    | 'treeFullGrown'
    | 'treeBare'
    | 'gardenBedEmpty1'
    | 'gardenBedEmpty2'
    | 'bushRound1'
    | 'bushRound2'
    | 'mushroomRed'
    | 'benchWood'
    | 'benchDetailed'
    | 'mushroomPair'
    | 'rockMossy1'
    | 'rockMossy2'
    | 'rockSmall1'
    | 'rockSmall2'
    | 'rockGray1'
    | 'rockGray2'
    | 'rockTan1'
    | 'rockTan2'
    | 'rockCluster1'
    | 'rockCluster2'
    | 'rockBoulder'
    | 'logSingle'
    | 'logPair'
    | 'fencePost1'
    | 'fencePost2'
    | 'potBrown'
    | 'hedgeLeafDark'
    | 'hedgeSprig'
    | 'flowerDaffodilYellow'
    | 'flowerDaffodilWhite'
    | 'flowerSpikeBlue'
    | 'flowerTulipRed'
    | 'flowerTulipGold'
    | 'flowerTulipBlue'
    | 'flowerTulipPink'
    | 'flowerBunchBlue'
    | 'flowerBunchRed'
    | 'flowerBunchGold'
    | 'flowerBunchPeriwinkle'
    | 'flowerStarWhite'
    | 'flowerBunchOrange';

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

        // Furniture / structures
        benchDetailed: { x: 64, y: 76, width: 51, height: 55 },
        potBrown: { x: 124, y: 68, width: 15, height: 13 },
        fencePost1: { x: 34, y: 44, width: 7, height: 23 },
        fencePost2: { x: 47, y: 44, width: 7, height: 23 },

        // Rocks
        rockMossy1: { x: 87, y: 19, width: 34, height: 25 },
        rockMossy2: { x: 123, y: 23, width: 23, height: 16 },
        rockSmall1: { x: 102, y: 47, width: 14, height: 8 },
        rockSmall2: { x: 87, y: 56, width: 14, height: 7 },
        rockGray1: { x: 11, y: 88, width: 17, height: 15 },
        rockGray2: { x: 32, y: 88, width: 13, height: 9 },
        rockTan1: { x: 41, y: 99, width: 8, height: 13 },
        rockTan2: { x: 31, y: 100, width: 7, height: 7 },
        rockCluster1: { x: 16, y: 107, width: 13, height: 11 },
        rockCluster2: { x: 31, y: 113, width: 24, height: 17 },
        rockBoulder: { x: 20, y: 132, width: 22, height: 15 },

        // Logs
        logSingle: { x: 41, y: 18, width: 8, height: 23 },
        logPair: { x: 60, y: 18, width: 20, height: 28 },

        // Bushes / hedges
        hedgeLeafDark: { x: 239, y: 148, width: 17, height: 18 },
        hedgeSprig: { x: 262, y: 154, width: 12, height: 11 },

        // Mushrooms
        mushroomPair: { x: 259, y: 133, width: 16, height: 10 },

        // Flowers
        flowerDaffodilYellow: { x: 210, y: 11, width: 15, height: 22 },
        flowerDaffodilWhite: { x: 195, y: 12, width: 12, height: 21 },
        flowerSpikeBlue: { x: 230, y: 12, width: 7, height: 21 },
        flowerTulipRed: { x: 241, y: 14, width: 7, height: 17 },
        flowerTulipGold: { x: 252, y: 14, width: 7, height: 17 },
        flowerTulipBlue: { x: 263, y: 14, width: 7, height: 17 },
        flowerTulipPink: { x: 274, y: 14, width: 7, height: 17 },
        flowerBunchBlue: { x: 210, y: 63, width: 18, height: 18 },
        flowerBunchRed: { x: 231, y: 63, width: 18, height: 18 },
        flowerBunchGold: { x: 252, y: 63, width: 18, height: 18 },
        flowerBunchPeriwinkle: { x: 273, y: 63, width: 18, height: 18 },
        flowerStarWhite: { x: 143, y: 86, width: 19, height: 23 },
        flowerBunchOrange: { x: 166, y: 87, width: 19, height: 22 },
    },
};

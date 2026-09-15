import type { SpriteAtlas } from '@/lib/sprite-atlas-types';

/**
 * Starter subset of spring_16x16.png (30 sprites total on the sheet — mushrooms,
 * tulips, flower clusters, rock variants). Extend by opening
 * /assets/images/garden-topdown/spring_16x16.png at 16px grid spacing (6 cols x 5 rows)
 * and adding more entries the same way.
 */
export type TopDownSmall16Key = 'mushroomCluster' | 'tulipPink' | 'flowerClusterPinkLily';

export const topDownSmall16Atlas: SpriteAtlas<TopDownSmall16Key> = {
  source: require('@/assets/images/garden-topdown/spring_16x16.png'),
  sheetWidth: 96,
  sheetHeight: 80,
  sprites: {
    mushroomCluster: { x: 0, y: 0, width: 16, height: 16 },
    tulipPink: { x: 0, y: 16, width: 16, height: 16 }, // index 6, row 1 col 0
    flowerClusterPinkLily: { x: 0, y: 32, width: 16, height: 16 }, // index 12
  },
};

export type TopDownTuft16x32Key = 'grassTuftTall' | 'flowerBushPurple';

export const topDownTuft16x32Atlas: SpriteAtlas<TopDownTuft16x32Key> = {
  source: require('@/assets/images/garden-topdown/spring_16x32.png'),
  sheetWidth: 96,
  sheetHeight: 32,
  sprites: {
    grassTuftTall: { x: 16, y: 0, width: 16, height: 32 },
    flowerBushPurple: { x: 64, y: 0, width: 16, height: 32 },
  },
};

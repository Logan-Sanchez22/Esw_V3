import type { SpriteAtlas } from '@/lib/sprite-atlas-types';

export type TopDownProp32Key =
  | 'flowerBushOrange'
  | 'flowerBushYellow'
  | 'rockGray'
  | 'rockWithWater'
  | 'stumpSmall'
  | 'logPileAngled'
  | 'lilyPadFlower';

export const topDownProps32Atlas: SpriteAtlas<TopDownProp32Key> = {
  source: require('@/assets/images/garden-topdown/spring_32x32.png'),
  sheetWidth: 224,
  sheetHeight: 32,
  sprites: {
    flowerBushOrange: { x: 0, y: 0, width: 32, height: 32 },
    flowerBushYellow: { x: 32, y: 0, width: 32, height: 32 },
    rockGray: { x: 64, y: 0, width: 32, height: 32 },
    rockWithWater: { x: 96, y: 0, width: 32, height: 32 },
    stumpSmall: { x: 128, y: 0, width: 32, height: 32 },
    logPileAngled: { x: 160, y: 0, width: 32, height: 32 },
    lilyPadFlower: { x: 192, y: 0, width: 32, height: 32 },
  },
};

export type TopDownProp48Key = 'stumpBig' | 'logPileWide' | 'logFallen';

export const topDownProps48Atlas: SpriteAtlas<TopDownProp48Key> = {
  source: require('@/assets/images/garden-topdown/spring_48x32.png'),
  sheetWidth: 144,
  sheetHeight: 32,
  sprites: {
    stumpBig: { x: 0, y: 0, width: 48, height: 32 },
    logPileWide: { x: 48, y: 0, width: 48, height: 32 },
    logFallen: { x: 96, y: 0, width: 48, height: 32 },
  },
};

import type { SpriteAtlas } from '@/lib/sprite-atlas-types';

// See src/lib/sprite-atlas-types.ts for what a "sprite atlas" is. The
// top-down garden's tree sprites, cropped from their own dedicated sheet.
export type TopDownTreeKey = 'treeCherryRed' | 'treeCherryPink' | 'treeTeal';

export const topDownTreesAtlas: SpriteAtlas<TopDownTreeKey> = {
  source: require('@/assets/images/garden-topdown/spring_trees_80x112.png'),
  sheetWidth: 240,
  sheetHeight: 112,
  sprites: {
    treeCherryRed: { x: 0, y: 0, width: 80, height: 112 },
    treeCherryPink: { x: 80, y: 0, width: 80, height: 112 },
    treeTeal: { x: 160, y: 0, width: 80, height: 112 },
  },
};

import type { SpriteAtlas } from '@/lib/sprite-atlas-types';

/**
 * Ground textures cropped from spring_forest.png. This pack is built around
 * Tiled's Wang-tile autotiling system (see spring_forest_wang_tiles.png), so
 * most tiles blend into their neighbors rather than being flat/pure. These
 * two were the cleanest standalone crops available for an MVP. To add more
 * (stone, water, path — the pack has them), open
 * /assets/images/garden-topdown/spring_forest_grid.png (32px coordinate grid
 * overlay) and read off an [x, y] position, then add an entry below.
 */
export type TopDownGroundKey = 'grass' | 'dirt';

export const topDownGroundAtlas: SpriteAtlas<TopDownGroundKey> = {
  source: require('@/assets/images/garden-topdown/spring_forest.png'),
  sheetWidth: 512,
  sheetHeight: 336,
  sprites: {
    grass: { x: 32, y: 32, width: 32, height: 32 },
    dirt: { x: 80, y: 48, width: 32, height: 32 },
  },
};

import type { SpriteAtlas } from '@/lib/sprite-atlas-types';

/**
 * Ground textures cropped from spring_forest.png. This pack is built around
 * Tiled's Wang-tile autotiling system (see spring_forest_wang_tiles.png), so
 * most tiles blend into their neighbors rather than being flat/pure. `water`
 * was found by scanning every cell of the 32px reference grid
 * (assets/images/measured/spring_forest_grid.png) for cells that are fully
 * opaque, low internal color variance, and blue-dominant — i.e. an actual
 * solid water tile, not a shoreline blend — then confirmed visually.
 * A pure stone/path tile still doesn't exist in this sheet: every candidate
 * found the same way turned out to be a half grass/half-stone blend tile
 * (e.g. the region around x=96-192,y=0-96), same conclusion as before.
 */
export type TopDownGroundKey = 'grass' | 'dirt' | 'water';

export const topDownGroundAtlas: SpriteAtlas<TopDownGroundKey> = {
  source: require('@/assets/images/garden-topdown/spring_forest.png'),
  sheetWidth: 512,
  sheetHeight: 336,
  sprites: {
    grass: { x: 32, y: 32, width: 32, height: 32 },
    dirt: { x: 80, y: 48, width: 32, height: 32 },
    water: { x: 288, y: 288, width: 32, height: 32 },
  },
};

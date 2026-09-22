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
 *
 * grass2/grass3/grass4 were found the same way (scan for cells close to
 * grass's own average color and variance, then confirmed visually) — three
 * of the closest matches turned out to be genuinely clean solid grass,
 * giving this screen the same kind of variant rotation the isometric ground
 * atlas already has. A fourth close candidate (x=0,y=32) was rejected on
 * the visual check: it has a faint diagonal seam, a leftover edge from
 * this sheet's autotiling. dirt had no equally-clean match at all: every
 * close-color candidate turned out to be a grass/dirt or dirt/rock blend
 * tile once viewed (e.g. x=96,y=64 and x=128,y=32), so dirt stays a single
 * sprite rather than faking variety with a tile that isn't actually pure
 * dirt.
 */
export type TopDownGroundKey = 'grass' | 'grass2' | 'grass3' | 'grass4' | 'dirt' | 'water';

export const topDownGroundAtlas: SpriteAtlas<TopDownGroundKey> = {
  source: require('@/assets/images/garden-topdown/spring_forest.png'),
  sheetWidth: 512,
  sheetHeight: 336,
  sprites: {
    grass: { x: 32, y: 32, width: 32, height: 32 },
    grass2: { x: 32, y: 0, width: 32, height: 32 },
    grass3: { x: 0, y: 64, width: 32, height: 32 },
    grass4: { x: 32, y: 64, width: 32, height: 32 },
    dirt: { x: 80, y: 48, width: 32, height: 32 },
    water: { x: 288, y: 288, width: 32, height: 32 },
  },
};

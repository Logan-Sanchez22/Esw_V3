export const GRID_SIZE = 15;

/** What's placed on a tile — just an id into whichever catalog is active, nothing view-specific. */
export type PlacedItemId = string | null;

export const DEFAULT_GROUND = 'grass';

/** A tile now carries both what it's planted with AND what it's made of. */
export type TileState = {
  ground: string;
  item: PlacedItemId;
};

export type CatalogItem = {
  id: string;
  label: string;
  cost: number;
  /**
   * How big this should render relative to a full tile (1 = fills the tile
   * like a tree does). Every decoration used to render at a flat tile-sized
   * box regardless of the source art's real proportions — AtlasSprite's
   * fit="contain" normalizes by the sprite's own longer dimension, so a 7px
   * flower and a 128px tree both got blown up to the same box. Same meaning
   * on both screens; each multiplies its own base tile size by this.
   * Starting values are a rough first pass, not measured — expect to retune
   * once these are visible on a device.
   */
  visualScale?: number;
};

export type GardenDomainState = {
  points: number;
  tiles: TileState[]; // length GRID_SIZE * GRID_SIZE, row-major
};

export function createEmptyGarden(): GardenDomainState {
  return {
    points: 0,
    tiles: Array.from({ length: GRID_SIZE * GRID_SIZE }, () => ({ ground: DEFAULT_GROUND, item: null })),
  };
}

export function canPlace(state: GardenDomainState, index: number, item: CatalogItem): boolean {
  if (index < 0 || index >= state.tiles.length) return false;
  const tile = state.tiles[index];
  if (tile.item !== null) return false;
  if (!isGroundPlaceable(tile.ground)) return false;
  return state.points >= item.cost;
}

export function placeItem(
  state: GardenDomainState,
  index: number,
  item: CatalogItem
): GardenDomainState {
  if (!canPlace(state, index, item)) return state;
  const tiles = [...state.tiles];
  tiles[index] = { ...tiles[index], item: item.id };
  return { points: state.points - item.cost, tiles };
}

export function addPoints(state: GardenDomainState, amount: number): GardenDomainState {
  return { ...state, points: state.points + amount };
}

/** Clears a tile's planting back to empty. No point refund — placing is a deliberate sink. */
export function removeItem(state: GardenDomainState, index: number): GardenDomainState {
  if (index < 0 || index >= state.tiles.length) return state;
  if (state.tiles[index].item === null) return state;
  const tiles = [...state.tiles];
  tiles[index] = { ...tiles[index], item: null };
  return { ...state, tiles };
}

/** Repaints a tile's ground. Free — only decorations cost points. */
export function paintGround(state: GardenDomainState, index: number, groundId: string): GardenDomainState {
  if (index < 0 || index >= state.tiles.length) return state;
  if (state.tiles[index].ground === groundId) return state;
  const tiles = [...state.tiles];
  tiles[index] = { ...tiles[index], ground: groundId };
  return { ...state, tiles };
}

export type PlacementBlock = 'occupied' | 'non-placeable-terrain' | 'insufficient-points' | null;

/** Why a placement would fail, for UI feedback — canPlace() collapses this to a bool. */
export function getPlacementBlock(
  state: GardenDomainState,
  index: number,
  item: CatalogItem
): PlacementBlock {
  if (index < 0 || index >= state.tiles.length) return 'occupied';
  const tile = state.tiles[index];
  if (tile.item !== null) return 'occupied';
  if (!isGroundPlaceable(tile.ground)) return 'non-placeable-terrain';
  if (state.points < item.cost) return 'insufficient-points';
  return null;
}

/**
 * The shared catalog of placeable items — same ids, labels and costs for both
 * garden screens, so picking "Tree" costs the same and behaves the same no
 * matter which view you're in. Each screen maps these ids to its own sprite
 * (see ITEM_SPRITE in garden.tsx / garden-alt.tsx) — not every id necessarily
 * has art in every atlas yet, so a screen may only show a subset of this list.
 */
export const CATALOG: CatalogItem[] = [
  { id: 'tree', label: 'Tree', cost: 12, visualScale: 1 },
  { id: 'treeBare', label: 'Bare Tree', cost: 8, visualScale: 0.9 },
  { id: 'bush', label: 'Bush', cost: 5, visualScale: 0.55 },
  { id: 'bushAlt', label: 'Bush', cost: 5, visualScale: 0.55 },
  { id: 'flower', label: 'Flowers', cost: 2, visualScale: 0.35 },
  { id: 'mushroom', label: 'Mushroom', cost: 3, visualScale: 0.3 },
  { id: 'rock', label: 'Rock', cost: 4, visualScale: 0.5 },
  { id: 'log', label: 'Log', cost: 3, visualScale: 0.5 },
  { id: 'bench', label: 'Bench', cost: 15, visualScale: 0.7 },
  // Top-down only for now — no honest iso counterpart in the 41 sprites
  // extracted from misc.png so far (lily pads/grass tufts aren't part of
  // that sheet's subject matter). Same asymmetry the iso side already has
  // in the other direction (bench, most flower colors).
  { id: 'lilyPad', label: 'Lily Pad', cost: 2, visualScale: 0.4 },
  { id: 'grassTuft', label: 'Grass Tuft', cost: 1, visualScale: 0.3 },
];

export function getCatalogItem(id: string): CatalogItem | undefined {
  return CATALOG.find((item) => item.id === id);
}

/** Sentinel picker selection id for the "clear this tile" tool — not a real catalog item. */
export const REMOVE_TOOL_ID = '__remove__';

export type GroundOption = {
  id: string;
  label: string;
  /**
   * Whether a decoration can be placed on this ground type. Defaults to
   * `true` (see getGroundOption/isGroundPlaceable) so future ground types
   * don't need to remember to opt in — only terrain that actually blocks
   * placement (water today; rock/building-footprint etc. later) needs to
   * set this false.
   */
  placeable?: boolean;
};

/**
 * Same idea as CATALOG but for ground types — same ids/labels for both
 * screens, each screen maps an id to its own sprite (see GROUND_SPRITE in
 * garden.tsx / garden-alt.tsx). `stonePath` has no top-down art yet, same
 * "coverage lags" situation as the decoration catalog.
 */
export const GROUND_CATALOG: GroundOption[] = [
  { id: 'grass', label: 'Grass' },
  { id: 'dirt', label: 'Dirt' },
  { id: 'water', label: 'Water', placeable: false },
  { id: 'stonePath', label: 'Stone Path' },
];

export function getGroundOption(id: string): GroundOption | undefined {
  return GROUND_CATALOG.find((ground) => ground.id === id);
}

/** Unknown ground ids default placeable — matches this game's behavior before terrain rules existed. */
export function isGroundPlaceable(groundId: string): boolean {
  return getGroundOption(groundId)?.placeable ?? true;
}

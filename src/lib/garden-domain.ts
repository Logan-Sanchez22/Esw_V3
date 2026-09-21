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
  if (state.tiles[index].item !== null) return false;
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

export type PlacementBlock = 'occupied' | 'insufficient-points' | null;

/** Why a placement would fail, for UI feedback — canPlace() collapses this to a bool. */
export function getPlacementBlock(
  state: GardenDomainState,
  index: number,
  item: CatalogItem
): PlacementBlock {
  if (index < 0 || index >= state.tiles.length) return 'occupied';
  if (state.tiles[index].item !== null) return 'occupied';
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
  { id: 'tree', label: 'Tree', cost: 12 },
  { id: 'treeBare', label: 'Bare Tree', cost: 8 },
  { id: 'bush', label: 'Bush', cost: 5 },
  { id: 'bushAlt', label: 'Bush', cost: 5 },
  { id: 'flower', label: 'Flowers', cost: 2 },
  { id: 'mushroom', label: 'Mushroom', cost: 3 },
  { id: 'rock', label: 'Rock', cost: 4 },
  { id: 'log', label: 'Log', cost: 3 },
  { id: 'bench', label: 'Bench', cost: 15 },
];

export function getCatalogItem(id: string): CatalogItem | undefined {
  return CATALOG.find((item) => item.id === id);
}

/** Sentinel picker selection id for the "clear this tile" tool — not a real catalog item. */
export const REMOVE_TOOL_ID = '__remove__';

export type GroundOption = {
  id: string;
  label: string;
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
  { id: 'water', label: 'Water' },
  { id: 'stonePath', label: 'Stone Path' },
];

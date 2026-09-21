export const GRID_SIZE = 15;

/** What's placed on a tile — just an id into whichever catalog is active, nothing view-specific. */
export type PlacedItemId = string | null;

export type CatalogItem = {
  id: string;
  label: string;
  cost: number;
};

export type GardenDomainState = {
  points: number;
  tiles: PlacedItemId[]; // length GRID_SIZE * GRID_SIZE, row-major
};

export function createEmptyGarden(): GardenDomainState {
  return { points: 0, tiles: Array(GRID_SIZE * GRID_SIZE).fill(null) };
}

export function canPlace(state: GardenDomainState, index: number, item: CatalogItem): boolean {
  if (index < 0 || index >= state.tiles.length) return false;
  if (state.tiles[index] !== null) return false;
  return state.points >= item.cost;
}

export function placeItem(
  state: GardenDomainState,
  index: number,
  item: CatalogItem
): GardenDomainState {
  if (!canPlace(state, index, item)) return state;
  const tiles = [...state.tiles];
  tiles[index] = item.id;
  return { points: state.points - item.cost, tiles };
}

export function addPoints(state: GardenDomainState, amount: number): GardenDomainState {
  return { ...state, points: state.points + amount };
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

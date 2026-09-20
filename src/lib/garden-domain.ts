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

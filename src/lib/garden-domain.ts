export const GRID_SIZE = 15;

/** What's placed on a tile — just an id into whichever catalog is active, nothing view-specific. */
export type PlacedItemId = string | null;

export const DEFAULT_GROUND = 'grass';

/** A tile now carries both what it's planted with AND what it's made of. */
export type TileState = {
  ground: string;
  item: PlacedItemId;
};

/**
 * Groups CATALOG for browsing — chosen to fit what's actually in the catalog
 * today (see the assignments below), not a generic taxonomy: trees for the
 * two tree items, plants for things you'd deliberately grow (bushes, flowers,
 * grass, a lily pad), nature for found/natural objects that aren't quite
 * "planted" (rock, log, mushroom), structures for the one man-made item.
 */
export type CatalogCategory = 'trees' | 'plants' | 'nature' | 'structures';

export type CatalogItem = {
  id: string;
  label: string;
  cost: number;
  /** Required, not optional — every item needs to be findable by category,
   * so a future addition can't silently ship without one. */
  category: CatalogCategory;
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
  /**
   * Total lifetime points *earned* (not current spendable balance) required
   * before this item can be placed at all — a light progression hook on top
   * of the quest points-earning loop that already exists, so the garden has
   * something to unlock over time beyond just "can I currently afford it."
   * Undefined = always unlocked (every item so far except a couple of
   * higher-cost ones picked as early milestones).
   */
  unlockThreshold?: number;
};

export type GardenDomainState = {
  points: number;
  /**
   * Lifetime points ever earned via addPoints — never decreases when points
   * are spent via placeItem, unlike `points` itself. Exists solely to drive
   * CatalogItem.unlockThreshold; nothing else should read it as "currency."
   */
  totalPointsEarned: number;
  tiles: TileState[]; // length GRID_SIZE * GRID_SIZE, row-major
};

export function createEmptyGarden(): GardenDomainState {
  return {
    points: 0,
    totalPointsEarned: 0,
    tiles: Array.from({ length: GRID_SIZE * GRID_SIZE }, () => ({ ground: DEFAULT_GROUND, item: null })),
  };
}

/** Undefined threshold means "always unlocked" — true for every item except a few milestone ones. */
export function isItemUnlocked(state: GardenDomainState, item: CatalogItem): boolean {
  return item.unlockThreshold === undefined || state.totalPointsEarned >= item.unlockThreshold;
}

export function canPlace(state: GardenDomainState, index: number, item: CatalogItem): boolean {
  if (index < 0 || index >= state.tiles.length) return false;
  const tile = state.tiles[index];
  if (tile.item !== null) return false;
  if (!isGroundPlaceable(tile.ground)) return false;
  if (!isItemUnlocked(state, item)) return false;
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
  return { ...state, points: state.points - item.cost, tiles };
}

export function addPoints(state: GardenDomainState, amount: number): GardenDomainState {
  return { ...state, points: state.points + amount, totalPointsEarned: state.totalPointsEarned + amount };
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

export type PlacementBlock = 'occupied' | 'non-placeable-terrain' | 'locked' | 'insufficient-points' | null;

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
  if (!isItemUnlocked(state, item)) return 'locked';
  if (state.points < item.cost) return 'insufficient-points';
  return null;
}

export type MoveBlock = 'same-tile' | 'occupied' | 'non-placeable-terrain' | null;

/** Why moving an already-placed item to toIndex would fail — no cost/unlock
 * checks, since the item is already owned and paid for; only whether the
 * destination itself can hold it. */
export function getMoveBlock(state: GardenDomainState, fromIndex: number, toIndex: number): MoveBlock {
  if (fromIndex === toIndex) return 'same-tile';
  if (toIndex < 0 || toIndex >= state.tiles.length) return 'occupied';
  const toTile = state.tiles[toIndex];
  if (toTile.item !== null) return 'occupied';
  if (!isGroundPlaceable(toTile.ground)) return 'non-placeable-terrain';
  return null;
}

export function canMoveItem(state: GardenDomainState, fromIndex: number, toIndex: number): boolean {
  if (fromIndex < 0 || fromIndex >= state.tiles.length) return false;
  if (state.tiles[fromIndex].item === null) return false;
  return getMoveBlock(state, fromIndex, toIndex) === null;
}

/** Moves an already-placed item to an empty, placeable tile. Free — the
 * item is already owned; this only relocates it. */
export function moveItem(state: GardenDomainState, fromIndex: number, toIndex: number): GardenDomainState {
  if (!canMoveItem(state, fromIndex, toIndex)) return state;
  const tiles = [...state.tiles];
  const itemId = tiles[fromIndex].item;
  tiles[fromIndex] = { ...tiles[fromIndex], item: null };
  tiles[toIndex] = { ...tiles[toIndex], item: itemId };
  return { ...state, tiles };
}

/**
 * The shared catalog of placeable items — same ids, labels and costs for both
 * garden screens, so picking "Tree" costs the same and behaves the same no
 * matter which view you're in. Each screen maps these ids to its own sprite
 * (see ITEM_SPRITE in garden.tsx / garden-alt.tsx) — not every id necessarily
 * has art in every atlas yet, so a screen may only show a subset of this list.
 */
export const CATALOG: CatalogItem[] = [
  // unlockThreshold picks: quests award ~65 points total (one-time, 5-25
  // each) — 20 is reachable after a couple of modest quests (an early
  // motivator), 50 takes most of them (a capstone reward for the priciest
  // item). Everything else stays unlocked from the start.
  { id: 'tree', label: 'Tree', cost: 12, visualScale: 1, unlockThreshold: 20, category: 'trees' },
  { id: 'treeBare', label: 'Bare Tree', cost: 8, visualScale: 0.9, category: 'trees' },
  { id: 'bush', label: 'Bush', cost: 5, visualScale: 0.55, category: 'plants' },
  { id: 'bushAlt', label: 'Bush', cost: 5, visualScale: 0.55, category: 'plants' },
  { id: 'flower', label: 'Flowers', cost: 2, visualScale: 0.35, category: 'plants' },
  { id: 'mushroom', label: 'Mushroom', cost: 3, visualScale: 0.3, category: 'nature' },
  { id: 'rock', label: 'Rock', cost: 4, visualScale: 0.5, category: 'nature' },
  { id: 'log', label: 'Log', cost: 3, visualScale: 0.5, category: 'nature' },
  { id: 'bench', label: 'Bench', cost: 15, visualScale: 0.7, unlockThreshold: 50, category: 'structures' },
  // Top-down only for now — no honest iso counterpart in the 41 sprites
  // extracted from misc.png so far (lily pads/grass tufts aren't part of
  // that sheet's subject matter). Same asymmetry the iso side already has
  // in the other direction (bench, most flower colors).
  { id: 'lilyPad', label: 'Lily Pad', cost: 2, visualScale: 0.4, category: 'plants' },
  { id: 'grassTuft', label: 'Grass Tuft', cost: 1, visualScale: 0.3, category: 'plants' },
];

export function getCatalogItem(id: string): CatalogItem | undefined {
  return CATALOG.find((item) => item.id === id);
}

/** Canonical order + display label for the category filter row — the one
 * place that list is defined, so the picker UI never hardcodes it again. */
export const CATALOG_CATEGORIES: { id: CatalogCategory; label: string }[] = [
  { id: 'trees', label: 'Trees' },
  { id: 'plants', label: 'Plants' },
  { id: 'nature', label: 'Nature' },
  { id: 'structures', label: 'Structures' },
];

/** First always-unlocked item — a sensible default picker selection for a
 * fresh player, since CATALOG[0] itself now carries an unlockThreshold. */
export const DEFAULT_CATALOG_ITEM_ID: string =
  CATALOG.find((item) => item.unlockThreshold === undefined)?.id ?? CATALOG[0].id;

/** Sentinel picker selection id for the "clear this tile" tool — not a real catalog item. */
export const REMOVE_TOOL_ID = '__remove__';

/**
 * What the picker's selection should fall back to when a category filter
 * hides the item that was selected — e.g. selecting "Trees" while a Bench
 * was selected. Prefers the first unlocked item in the still-visible set
 * (mirrors DEFAULT_CATALOG_ITEM_ID's own rule of never defaulting to
 * something the player can't yet place); falls back to the first visible
 * item regardless of lock state, or the Remove tool if the filtered set is
 * empty (can't happen with today's catalog, but every category should stay
 * non-empty by construction — this is just the safe floor).
 */
export function pickFallbackSelection(state: GardenDomainState, visibleItems: CatalogItem[]): string {
  const firstUnlocked = visibleItems.find((item) => isItemUnlocked(state, item));
  return firstUnlocked?.id ?? visibleItems[0]?.id ?? REMOVE_TOOL_ID;
}

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

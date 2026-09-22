export const GRID_SIZE = 15;

/** What's placed on a tile — just an id into whichever catalog is active, nothing view-specific. */
export type PlacedItemId = string | null;

export const DEFAULT_GROUND = 'grass';

/** A tile now carries both what it's planted with AND what it's made of. */
export type TileState = {
  ground: string;
  /** Set only on a placement's anchor tile (see CatalogItem.footprint) —
   * null on an empty tile AND on any other tile a multi-tile item's
   * footprint also occupies (those carry `anchorIndex` instead). */
  item: PlacedItemId;
  /** Present only on a tile that's occupied as part of another tile's
   * multi-tile footprint (never on the anchor itself, never on an empty
   * tile) — points back to the anchor tile's index, so a tap anywhere in
   * the footprint (not just its anchor) can resolve which placement it
   * belongs to. See resolvePlacement. Optional and additive: every
   * existing 1x1 placement never sets this, so old saved gardens (and the
   * jsonb column they sync to) need no migration. */
  anchorIndex?: number;
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
  /**
   * Tiles this item occupies when placed, anchored at whichever tile was
   * tapped to place it (that tap becomes the footprint's top-left corner;
   * it expands right/down from there). Undefined = 1x1, the default and by
   * far the common case — every existing item is unaffected. See
   * getItemFootprint/getFootprintCells below.
   */
  footprint?: { width: number; height: number };
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

/** A tile with nothing on it at all — neither a real item nor another
 * tile's footprint reaching into it. */
export function isTileEmpty(tile: TileState): boolean {
  return tile.item === null && tile.anchorIndex === undefined;
}

/** 1x1 default for every item that doesn't declare a footprint. */
export function getItemFootprint(item: CatalogItem): { width: number; height: number } {
  return item.footprint ?? { width: 1, height: 1 };
}

/**
 * Every tile index a footprint anchored at `anchorIndex` would occupy, or
 * null if any of it would fall outside the grid — a footprint can't wrap
 * across a row boundary the way a naive `anchorIndex + n` walk would allow,
 * so this works in row/col space instead of flat index arithmetic.
 */
export function getFootprintCells(anchorIndex: number, width: number, height: number): number[] | null {
  const anchorRow = Math.floor(anchorIndex / GRID_SIZE);
  const anchorCol = anchorIndex % GRID_SIZE;
  if (anchorCol + width > GRID_SIZE || anchorRow + height > GRID_SIZE) return null;

  const cells: number[] = [];
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      cells.push((anchorRow + r) * GRID_SIZE + (anchorCol + c));
    }
  }
  return cells;
}

/**
 * Resolves any tile a placement touches — its anchor, or another tile a
 * multi-tile footprint reaches into — back to that placement's anchor index
 * and item id. Null if the tile is empty. Every remove/move/interact tap
 * handler resolves through this first, so tapping anywhere in a multi-tile
 * item's footprint (not just the corner it was placed from) behaves the
 * same as tapping the anchor itself.
 */
export function resolvePlacement(
  state: GardenDomainState,
  index: number
): { anchorIndex: number; itemId: string } | null {
  if (index < 0 || index >= state.tiles.length) return null;
  const tile = state.tiles[index];
  if (tile.item !== null) return { anchorIndex: index, itemId: tile.item };
  if (tile.anchorIndex !== undefined) {
    const anchorItem = state.tiles[tile.anchorIndex]?.item;
    if (anchorItem !== null && anchorItem !== undefined) {
      return { anchorIndex: tile.anchorIndex, itemId: anchorItem };
    }
  }
  return null;
}

/**
 * Clears any `anchorIndex` pointer that no longer corresponds to a real
 * footprint cell — the only way that can happen is a catalog item's
 * footprint shrinking or disappearing after tiles were already saved under
 * its old, larger shape (e.g. Bench going from 2x1 back to 1x1). Without
 * this, a tile like that stays permanently and invisibly "occupied"
 * (isTileEmpty checks anchorIndex, not just item) even though nothing
 * placed it there and nothing would ever clear it on its own — the anchor's
 * own item is untouched, so ordinary remove/move never revisits it. Safe to
 * run on every load: a no-op whenever nothing is actually stale.
 */
export function pruneStaleFootprints(state: GardenDomainState): GardenDomainState {
  let changed = false;
  const tiles = state.tiles.map((tile, index) => {
    if (tile.anchorIndex === undefined) return tile;
    const anchorItemId = state.tiles[tile.anchorIndex]?.item;
    const anchorItem = anchorItemId ? getCatalogItem(anchorItemId) : undefined;
    const cells = anchorItem
      ? getFootprintCells(tile.anchorIndex, getItemFootprint(anchorItem).width, getItemFootprint(anchorItem).height)
      : null;
    if (anchorItemId && cells?.includes(index)) return tile;
    changed = true;
    return { ...tile, anchorIndex: undefined };
  });
  return changed ? { ...state, tiles } : state;
}

/** Clears every cell of a footprint anchored at `anchorIndex` back to empty. */
function clearFootprint(tiles: TileState[], anchorIndex: number, width: number, height: number): void {
  const cells = getFootprintCells(anchorIndex, width, height) ?? [anchorIndex];
  for (const cell of cells) {
    tiles[cell] = { ...tiles[cell], item: null, anchorIndex: undefined };
  }
}

/** Occupies every cell of a footprint anchored at `anchorIndex` with `itemId`. */
function occupyFootprint(
  tiles: TileState[],
  anchorIndex: number,
  itemId: string,
  width: number,
  height: number
): void {
  tiles[anchorIndex] = { ...tiles[anchorIndex], item: itemId };
  const cells = getFootprintCells(anchorIndex, width, height) ?? [anchorIndex];
  for (const cell of cells) {
    if (cell === anchorIndex) continue;
    tiles[cell] = { ...tiles[cell], item: null, anchorIndex };
  }
}

export function canPlace(state: GardenDomainState, index: number, item: CatalogItem): boolean {
  return getPlacementBlock(state, index, item) === null;
}

export function placeItem(
  state: GardenDomainState,
  index: number,
  item: CatalogItem
): GardenDomainState {
  if (!canPlace(state, index, item)) return state;
  const { width, height } = getItemFootprint(item);
  const tiles = [...state.tiles];
  occupyFootprint(tiles, index, item.id, width, height);
  return { ...state, points: state.points - item.cost, tiles };
}

export function addPoints(state: GardenDomainState, amount: number): GardenDomainState {
  return { ...state, points: state.points + amount, totalPointsEarned: state.totalPointsEarned + amount };
}

/** Clears a placement back to empty, wherever in its footprint `index`
 * lands. No point refund — placing is a deliberate sink. */
export function removeItem(state: GardenDomainState, index: number): GardenDomainState {
  const resolved = resolvePlacement(state, index);
  if (!resolved) return state;
  const item = getCatalogItem(resolved.itemId);
  const { width, height } = item ? getItemFootprint(item) : { width: 1, height: 1 };
  const tiles = [...state.tiles];
  clearFootprint(tiles, resolved.anchorIndex, width, height);
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

/**
 * A named multi-tile ground "stamp" — paints every tile in its footprint to
 * one ground type in a single placement (e.g. a Lake paints a 3x2 block of
 * water), anchored at whichever tile was tapped the same way a
 * CatalogItem.footprint decoration is. Distinct from the single-tile ground
 * brush (GROUND_CATALOG, still used for free-form painting): a formation is
 * a deliberate, previewed placement, not a continuous paint tool. Also free
 * (ground painting has never cost points) and, unlike decorations, has no
 * undo — it isn't tracked as an owned, movable/removable unit, just a bulk
 * ground repaint; painting over it (with the brush or another formation) is
 * how you change your mind.
 */
export type GroundFormation = {
  id: string;
  label: string;
  groundId: string;
  footprint: { width: number; height: number };
};

export const GROUND_FORMATIONS: GroundFormation[] = [
  { id: 'lake', label: 'Lake', groundId: 'water', footprint: { width: 3, height: 2 } },
];

export function getGroundFormation(id: string): GroundFormation | undefined {
  return GROUND_FORMATIONS.find((formation) => formation.id === id);
}

/** The only thing that can block a formation is running off the grid edge —
 * ground painting has never checked occupancy or terrain (you can already
 * repaint under an existing decoration with the single-tile brush; a
 * formation is the same free-form repaint, just stamped over more tiles at
 * once), so this stays consistent with that rather than inventing new rules
 * ground painting doesn't otherwise have. */
export function canPaintFormation(index: number, formation: GroundFormation): boolean {
  return getFootprintCells(index, formation.footprint.width, formation.footprint.height) !== null;
}

export function paintFormation(
  state: GardenDomainState,
  index: number,
  formation: GroundFormation
): GardenDomainState {
  const cells = getFootprintCells(index, formation.footprint.width, formation.footprint.height);
  if (cells === null) return state;
  const tiles = [...state.tiles];
  for (const cell of cells) {
    tiles[cell] = { ...tiles[cell], ground: formation.groundId };
  }
  return { ...state, tiles };
}

export type PlacementBlock =
  | 'occupied'
  | 'non-placeable-terrain'
  | 'locked'
  | 'insufficient-points'
  | 'out-of-bounds'
  | null;

/**
 * Why a placement would fail, for UI feedback — canPlace() collapses this to
 * a bool. `index` is the tapped tile, which becomes the anchor (top-left
 * corner) of the item's whole footprint — every cell that footprint would
 * occupy is checked, not just `index` itself.
 */
export function getPlacementBlock(
  state: GardenDomainState,
  index: number,
  item: CatalogItem
): PlacementBlock {
  if (index < 0 || index >= state.tiles.length) return 'occupied';
  const { width, height } = getItemFootprint(item);
  const cells = getFootprintCells(index, width, height);
  if (cells === null) return 'out-of-bounds';

  for (const cell of cells) {
    const tile = state.tiles[cell];
    if (!isTileEmpty(tile)) return 'occupied';
    if (!isGroundPlaceable(tile.ground)) return 'non-placeable-terrain';
  }
  if (!isItemUnlocked(state, item)) return 'locked';
  if (state.points < item.cost) return 'insufficient-points';
  return null;
}

export type MoveBlock = 'same-tile' | 'occupied' | 'non-placeable-terrain' | 'out-of-bounds' | null;

/** Why moving an already-placed item to toIndex would fail — no cost/unlock
 * checks, since the item is already owned and paid for; only whether the
 * destination itself can hold it. `fromIndex` must already be a resolved
 * anchor (see resolvePlacement) — every cell the item's footprint would
 * occupy at the new anchor is checked, excluding cells it already occupies
 * at its current position (so a footprint can shift by less than its own
 * width/height without tripping over itself). */
export function getMoveBlock(state: GardenDomainState, fromIndex: number, toIndex: number): MoveBlock {
  if (fromIndex === toIndex) return 'same-tile';
  if (fromIndex < 0 || fromIndex >= state.tiles.length) return 'occupied';
  const fromItemId = state.tiles[fromIndex].item;
  if (fromItemId === null) return 'occupied';

  const item = getCatalogItem(fromItemId);
  const { width, height } = item ? getItemFootprint(item) : { width: 1, height: 1 };
  const destCells = getFootprintCells(toIndex, width, height);
  if (destCells === null) return 'out-of-bounds';

  const sourceCells = new Set(getFootprintCells(fromIndex, width, height) ?? [fromIndex]);
  for (const cell of destCells) {
    if (sourceCells.has(cell)) continue;
    const tile = state.tiles[cell];
    if (!isTileEmpty(tile)) return 'occupied';
    if (!isGroundPlaceable(tile.ground)) return 'non-placeable-terrain';
  }
  return null;
}

export function canMoveItem(state: GardenDomainState, fromIndex: number, toIndex: number): boolean {
  if (fromIndex < 0 || fromIndex >= state.tiles.length) return false;
  if (state.tiles[fromIndex].item === null) return false;
  return getMoveBlock(state, fromIndex, toIndex) === null;
}

/** Moves an already-placed item to an empty, placeable tile (and its whole
 * footprint, if it has one) — `fromIndex` must already be a resolved anchor
 * (see resolvePlacement). Free — the item is already owned; this only
 * relocates it. */
export function moveItem(state: GardenDomainState, fromIndex: number, toIndex: number): GardenDomainState {
  if (!canMoveItem(state, fromIndex, toIndex)) return state;
  const itemId = state.tiles[fromIndex].item as string;
  const item = getCatalogItem(itemId);
  const { width, height } = item ? getItemFootprint(item) : { width: 1, height: 1 };

  const tiles = [...state.tiles];
  clearFootprint(tiles, fromIndex, width, height);
  occupyFootprint(tiles, toIndex, itemId, width, height);
  return { ...state, tiles };
}

/**
 * One place/move/remove the UI has already applied, kept just long enough
 * to reverse it — see undoAction below. Not persisted (see
 * garden-domain-store.tsx): undo only ever applies to the current session's
 * single most recent action, standard undo semantics, not a saved history.
 */
export type UndoableAction =
  | { kind: 'place'; index: number; itemId: string; cost: number }
  | { kind: 'move'; fromIndex: number; toIndex: number; itemId: string }
  | { kind: 'remove'; index: number; itemId: string };

/**
 * Reverses one already-applied action directly, bypassing the normal
 * canPlace/cost/unlock checks placeItem enforces — this is undoing
 * something that already validly happened, not making a new purchase, so
 * re-validating it against (possibly since-changed) current state would be
 * wrong. Always safe to call: the tile(s) involved can't have been touched
 * by anything else since, because any other place/move/remove would have
 * replaced this as "the last action" before undo could run.
 *
 * Undo refunds a placement's cost and restores a removed item for free —
 * deliberately different from the Remove tool itself (no refund, a
 * declared sink): Remove is "I don't want this," undo is "that wasn't what
 * I meant," and those should feel different.
 */
export function undoAction(state: GardenDomainState, action: UndoableAction): GardenDomainState {
  switch (action.kind) {
    case 'place': {
      const item = getCatalogItem(action.itemId);
      const { width, height } = item ? getItemFootprint(item) : { width: 1, height: 1 };
      const tiles = [...state.tiles];
      clearFootprint(tiles, action.index, width, height);
      return { ...state, points: state.points + action.cost, tiles };
    }
    case 'move': {
      const item = getCatalogItem(action.itemId);
      const { width, height } = item ? getItemFootprint(item) : { width: 1, height: 1 };
      const tiles = [...state.tiles];
      clearFootprint(tiles, action.toIndex, width, height);
      occupyFootprint(tiles, action.fromIndex, action.itemId, width, height);
      return { ...state, tiles };
    }
    case 'remove': {
      const item = getCatalogItem(action.itemId);
      const { width, height } = item ? getItemFootprint(item) : { width: 1, height: 1 };
      const tiles = [...state.tiles];
      occupyFootprint(tiles, action.index, action.itemId, width, height);
      return { ...state, tiles };
    }
  }
}

/**
 * The shared catalog of placeable items — same ids, labels and costs for both
 * garden screens, so picking "Tree" costs the same and behaves the same no
 * matter which view you're in. Each screen maps these ids to its own sprite
 * (see ITEM_SPRITE in garden.tsx / garden-alt.tsx) — not every id necessarily
 * has art in every atlas yet, so a screen may only show a subset of this list.
 */
export const CATALOG: CatalogItem[] = [
  // unlockThreshold ladder: 5 checkpoints (20/30/40/50/70) instead of the
  // original 2 (20/50) — now that quests are daily-repeatable (see
  // quest-domain.ts), totalPointsEarned keeps growing indefinitely instead
  // of maxing out around one one-time ~65pt run, so there's room for an
  // ongoing "next unlock" beyond the first session. Cheap basics (treeBare,
  // bush, flower, rock, log, grassTuft) stay free from the start so a fresh
  // garden isn't empty on day one — only the "one more variant"/capstone
  // items are gated.
  { id: 'tree', label: 'Tree', cost: 12, visualScale: 1, unlockThreshold: 20, category: 'trees' },
  { id: 'treeBare', label: 'Bare Tree', cost: 8, visualScale: 0.9, category: 'trees' },
  { id: 'bush', label: 'Bush', cost: 5, visualScale: 0.55, category: 'plants' },
  { id: 'bushAlt', label: 'Bush', cost: 5, visualScale: 0.55, unlockThreshold: 30, category: 'plants' },
  { id: 'flower', label: 'Flowers', cost: 2, visualScale: 0.35, category: 'plants' },
  { id: 'mushroom', label: 'Mushroom', cost: 3, visualScale: 0.3, unlockThreshold: 40, category: 'nature' },
  { id: 'rock', label: 'Rock', cost: 4, visualScale: 0.5, category: 'nature' },
  { id: 'log', label: 'Log', cost: 3, visualScale: 0.5, category: 'nature' },
  { id: 'bench', label: 'Bench', cost: 15, visualScale: 0.7, unlockThreshold: 50, category: 'structures' },
  // Top-down only for now — no honest iso counterpart in the 41 sprites
  // extracted from misc.png so far (lily pads/grass tufts aren't part of
  // that sheet's subject matter). Same asymmetry the iso side already has
  // in the other direction (bench, most flower colors).
  { id: 'lilyPad', label: 'Lily Pad', cost: 2, visualScale: 0.4, unlockThreshold: 70, category: 'plants' },
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

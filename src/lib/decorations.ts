import { isoDecorationAtlas } from '@/lib/atlases/iso-decoration-atlas';
import { topDownTreesAtlas } from '@/lib/atlases/topdown-trees-atlas';
import { topDownProps32Atlas, topDownProps48Atlas } from '@/lib/atlases/topdown-props-atlas';
import { topDownSmall16Atlas, topDownTuft16x32Atlas } from '@/lib/atlases/topdown-small-atlas';

// All isometric decorations share one atlas, so this stays strictly typed
// against its real sprite keys. Top-down decorations are spread across five
// different atlases (see below) — typed loosely here and cast at the
// AtlasSprite call site, the same way garden-alt.tsx already did before this
// file existed; a generic wrapper to make that side strict too isn't worth
// it for a handful of atlases with no shared shape.
type IsoSpriteRef = { atlas: typeof isoDecorationAtlas; key: keyof typeof isoDecorationAtlas.sprites };
type TopDownSpriteRef = { atlas: any; key: any };

/**
 * Per-decoration art, one entry per CATALOG id (garden-domain.ts), keyed by
 * screen. Not every id has art on every screen yet — a screen falls back to
 * UnknownItemMarker when its side is missing (see garden.tsx/garden-alt.tsx).
 * This replaces two independently hand-maintained ITEM_SPRITE dictionaries
 * (one per garden screen) that could silently drift out of sync — this is
 * the single place both screens read from now.
 */
export const DECORATION_SPRITES: Record<string, { isometric?: IsoSpriteRef; topDown?: TopDownSpriteRef }> = {
    tree: {
        isometric: { atlas: isoDecorationAtlas, key: 'treeFullGrown' },
        topDown: { atlas: topDownTreesAtlas, key: 'treeCherryPink' },
    },
    treeBare: {
        isometric: { atlas: isoDecorationAtlas, key: 'treeBare' },
        // treeTeal (topDownTreesAtlas) turned out to be a flat, low-detail round
        // canopy silhouette — confirmed on-device it reads as an unrecognizable
        // blob at decoration size, and doesn't look like a "bare tree" at all.
        // A stump is a much more honest fit for that concept, and has real
        // wood-grain detail that survives being scaled down. stumpSmall (32x32,
        // topDownProps32Atlas) stays available for a future distinct catalog
        // item if wanted.
        topDown: { atlas: topDownProps48Atlas, key: 'stumpBig' },
    },
    bush: {
        isometric: { atlas: isoDecorationAtlas, key: 'bushRound1' },
        topDown: { atlas: topDownProps32Atlas, key: 'flowerBushOrange' },
    },
    bushAlt: {
        isometric: { atlas: isoDecorationAtlas, key: 'bushRound2' },
        topDown: { atlas: topDownProps32Atlas, key: 'flowerBushYellow' },
    },
    flower: {
        isometric: { atlas: isoDecorationAtlas, key: 'flowerBunchRed' },
        topDown: { atlas: topDownSmall16Atlas, key: 'tulipPink' },
    },
    mushroom: {
        isometric: { atlas: isoDecorationAtlas, key: 'mushroomRed' },
        topDown: { atlas: topDownSmall16Atlas, key: 'mushroomCluster' },
    },
    rock: {
        isometric: { atlas: isoDecorationAtlas, key: 'rockBoulder' },
        topDown: { atlas: topDownProps32Atlas, key: 'rockGray' },
    },
    log: {
        isometric: { atlas: isoDecorationAtlas, key: 'logPair' },
        topDown: { atlas: topDownProps32Atlas, key: 'logPileAngled' },
    },
    // Iso-only — no top-down art yet.
    bench: {
        isometric: { atlas: isoDecorationAtlas, key: 'benchDetailed' },
    },
    // Top-down only — no honest iso counterpart in the 41 sprites extracted
    // from misc.png so far (see the comment on these two in CATALOG,
    // garden-domain.ts).
    lilyPad: {
        topDown: { atlas: topDownProps32Atlas, key: 'lilyPadFlower' },
    },
    grassTuft: {
        topDown: { atlas: topDownTuft16x32Atlas, key: 'grassTuftTall' },
    },
};

export function getDecorationSprite(id: string, screen: 'isometric'): IsoSpriteRef | undefined;
export function getDecorationSprite(id: string, screen: 'topDown'): TopDownSpriteRef | undefined;
export function getDecorationSprite(id: string, screen: 'isometric' | 'topDown') {
    return DECORATION_SPRITES[id]?.[screen];
}

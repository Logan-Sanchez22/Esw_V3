import { View, Text } from 'react-native'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { styled } from "nativewind";
import { Link } from "expo-router";
import {
    SafeAreaView as RNSafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";

import { AmbientParticles } from '@/components/AmbientParticles';
import { AtlasSprite } from '@/components/AtlasSprite';
import { DecorationInfoCard } from '@/components/DecorationInfoCard';
import { DecorationShadow } from '@/components/DecorationShadow';
import { IsometricGrid } from '@/components/IsometricGrid';
import { ItemPicker, PickerEntry } from '@/components/ItemPicker';
import { ModeToggle } from '@/components/ModeToggle';
import { PlacementConfirmBar } from '@/components/PlacementConfirmBar';
import { UnknownItemMarker } from '@/components/UnknownItemMarker';
import { ScreenHeader, StatPill } from '@/components/ui';
import { isoBlocksAtlas, IsoBlockKey } from '@/lib/atlases/iso-blocks-atlas';
import { getDecorationSprite } from '@/lib/decorations';
import { pickVariant } from '@/lib/variantPick';
import {
    CATALOG,
    CATALOG_CATEGORIES,
    CatalogCategory,
    DEFAULT_CATALOG_ITEM_ID,
    GRID_SIZE,
    GROUND_CATALOG,
    REMOVE_TOOL_ID,
    getCatalogItem,
    getMoveBlock,
    getPlacementBlock,
    isItemUnlocked,
    pickFallbackSelection,
} from '@/lib/garden-domain';
import { useGardenDomain } from '@/context/garden-domain-store';
import { useStatusMessage } from '@/lib/useStatusMessage';
import { colors, components, gridOutlineOpacity } from '../../../constants/theme';

const SafeAreaView = styled(RNSafeAreaView);

// Precisely pixel-measured from blocks.png (grassFlat and soilPlain1 rects,
// both 30x27 native): the top face's own diamond (top point to bottom point)
// is exactly 16 native px, i.e. 32 at this screen's 2x scale (TILE_WIDTH=60
// vs the native rect's 30). An earlier pass here used 28 (an approximate
// "30:14" measurement) — close enough not to look obviously broken at a
// glance, but it made every tile's outline sit ~4px inside the sprite's real
// edge, visible as a thin sliver wherever a color/terrain boundary crosses a
// tile (confirmed on-device, then verified by compositing the real sprite
// at both step values before changing this). 32 is the step gridSize tiles
// are positioned at AND the height tile outlines are drawn at (IsometricGrid
// reuses tileHeightStep for both) — they must be the same number for a
// tile's outline to trace its own sprite's real edge.
const TILE_WIDTH = 60;
const TILE_HEIGHT_STEP = 32;
const TILE_OUTLINE_COLOR = colors.tileOutline;
const PREVIEW_HIGHLIGHT_COLOR = colors.highlight;

const PICKER_ICON_SIZE = 32;

type Mode = 'decorate' | 'paint' | 'interact';

const MODE_OPTIONS = [
    { id: 'decorate' as const, label: '🌳 Decorate' },
    { id: 'paint' as const, label: '🎨 Ground' },
    { id: 'interact' as const, label: '👆 Interact' },
];

// 'all' plus every real category, in CATALOG_CATEGORIES' canonical order —
// the decoration picker's filter row. Reuses ModeToggle itself (not just its
// visual pattern) since a pill-row single-select is exactly what this is.
type CategoryFilter = 'all' | CatalogCategory;
const CATEGORY_FILTER_OPTIONS = [
    { id: 'all' as const, label: 'All' },
    ...CATALOG_CATEGORIES.map((category) => ({ id: category.id, label: category.label })),
];

// All 47 iso ground tiles exist in the atlas — these four are the curated
// selection exposed as paintable ground types (see GROUND_CATALOG). This is
// also each type's picker-icon and fallback sprite — actual placed tiles use
// getGroundSpriteKey below for grass/dirt, which vary per-tile.
const GROUND_SPRITE: Record<string, keyof typeof isoBlocksAtlas.sprites> = {
    grass: 'grassFlat',
    dirt: 'soilPlain1',
    water: 'waterPlain',
    stonePath: 'stonePathPlain1',
};

// A few flat, plain variants per type (checked against the actual sprite
// sheet — not every "grass"-ish or "soil"-ish sprite qualifies: sparkle/moss/
// speckle sprites with visible extra detail were left out where they'd read
// as clutter rather than a subtle natural variation). Repeating an entry
// weights it higher — grassFlat/soilPlain1 stay the common case.
const GRASS_VARIANTS: readonly IsoBlockKey[] = ['grassFlat', 'grassFlat', 'grassPlain2', 'grassSparkle1'];
const DIRT_VARIANTS: readonly IsoBlockKey[] = ['soilPlain1', 'soilPlain1', 'soilPlain2', 'soilSpeckled1'];
const GROUND_VARIANTS: Partial<Record<string, readonly IsoBlockKey[]>> = {
    grass: GRASS_VARIANTS,
    dirt: DIRT_VARIANTS,
};

// Deterministic per-tile pick (same tile always renders the same variant,
// no new persisted field needed) — stonePath has no variant list, so it
// always falls through to its single GROUND_SPRITE entry. Water instead
// rotates through the atlas's waterPlain/waterRipple pair as waterTick
// advances — a rotating subset of tiles (one in five) shows the ripple
// frame each tick, so the whole pond doesn't blink in lockstep.
function getGroundSpriteKey(groundId: string, tileIndex: number, waterTick: number): keyof typeof isoBlocksAtlas.sprites {
    if (groundId === 'water') {
        return (tileIndex + waterTick) % 5 === 0 ? 'waterRipple' : 'waterPlain';
    }
    const variants = GROUND_VARIANTS[groundId];
    if (variants) return pickVariant(tileIndex, variants);
    return GROUND_SPRITE[groundId] ?? 'grassFlat';
}

// One full back-and-forth cycle, in degrees — offset per tile index (added
// to the tick before indexing) so a garden full of trees doesn't sway in
// unison like it's one object.
const SWAY_STEPS_DEG = [-2, -1, 0, 1, 2, 1, 0, -1] as const;
function getSwayDegrees(tileIndex: number, tick: number): number {
    return SWAY_STEPS_DEG[(tileIndex + tick) % SWAY_STEPS_DEG.length];
}

const GROUND_PICKER_ITEMS: PickerEntry[] = GROUND_CATALOG.map((ground) => ({
    id: ground.id,
    label: ground.label,
    cost: 0,
    icon: (
        <AtlasSprite
            atlas={isoBlocksAtlas}
            sprite={GROUND_SPRITE[ground.id]}
            size={PICKER_ICON_SIZE}
        />
    ),
}));

const Garden = () => {
    const { state, placeItem, removeItem, moveItem, paintGround } = useGardenDomain();
    const [mode, setMode] = useState<Mode>('decorate');
    const [selectedItemId, setSelectedItemId] = useState<string>(DEFAULT_CATALOG_ITEM_ID);
    const [selectedGroundId, setSelectedGroundId] = useState<string>(GROUND_CATALOG[0].id);
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
    const { message, showMessage } = useStatusMessage();

    const insets = useSafeAreaInsets();

    const bottomNavSpace = 100 + insets.bottom;

    // Which tile is showing a pending (unconfirmed) decoration ghost —
    // pure UI state, never touches domain state until Confirm is tapped.
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);

    // A stale ghost must never keep showing once what's selected changes.
    useEffect(() => {
        setPreviewIndex(null);
    }, [selectedItemId, mode]);

    // Interact mode: tapping a placed decoration shows an info card
    // (interactSelectedIndex). Tapping its Move button captures which item
    // and tile it came from (moveItemId/moveFromIndex) and switches to
    // "pick a destination" — tapping tiles from then on previews a move
    // there (movePreviewIndex) instead of showing the info card again.
    const [interactSelectedIndex, setInteractSelectedIndex] = useState<number | null>(null);
    const [moveFromIndex, setMoveFromIndex] = useState<number | null>(null);
    const [moveItemId, setMoveItemId] = useState<string | null>(null);
    const [movePreviewIndex, setMovePreviewIndex] = useState<number | null>(null);

    const cancelMove = () => {
        setMoveFromIndex(null);
        setMoveItemId(null);
        setMovePreviewIndex(null);
    };

    // Eases the camera to a tile once, after a placement/move is confirmed —
    // token increments on every request so flying to the same tile twice in
    // a row still fires (IsometricGrid keys its effect off token, not index).
    const [flyTo, setFlyTo] = useState<{ index: number; token: number } | null>(null);
    const flyTokenRef = useRef(0);
    const flyToTile = (index: number) => {
        flyTokenRef.current += 1;
        setFlyTo({ index, token: flyTokenRef.current });
    };

    // Leaving interact mode drops any selection/move in progress.
    useEffect(() => {
        if (mode !== 'interact') {
            setInteractSelectedIndex(null);
            cancelMove();
        }
    }, [mode]);

    // Brief red flash on a tile that was just tapped but blocked — same
    // pattern as useStatusMessage's timeout, but keyed to a tile index
    // instead of text, so it can render as a fill on that one tile.
    const [invalidFlashIndex, setInvalidFlashIndex] = useState<number | null>(null);
    const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const flashInvalid = (index: number) => {
        if (flashTimer.current) clearTimeout(flashTimer.current);
        setInvalidFlashIndex(index);
        flashTimer.current = setTimeout(() => setInvalidFlashIndex(null), 400);
    };
    useEffect(() => () => {
        if (flashTimer.current) clearTimeout(flashTimer.current);
    }, []);

    // Advances the water-ripple frame on a timer, but only while a water
    // tile actually exists — no point re-rendering the whole 225-tile grid
    // on an interval for a garden with no pond.
    const hasWater = useMemo(() => state.tiles.some((tile) => tile.ground === 'water'), [state.tiles]);
    const [waterTick, setWaterTick] = useState(0);
    useEffect(() => {
        if (!hasWater) return;
        const id = setInterval(() => setWaterTick((t) => t + 1), 1200);
        return () => clearInterval(id);
    }, [hasWater]);

    // Gentle idle sway on trees/plants — a discrete step-cycle driven by
    // plain interval state, the same proven-safe mechanism as the water
    // ripple above, not a continuous Reanimated transform. This screen's
    // decorations render nested inside the pan/zoom gesture's own
    // Reanimated-driven transform, and this session already hit one real
    // bug from a *different* kind of Reanimated animation (layout
    // entering/exiting) misbehaving in exactly that nesting — a continuous
    // transform nested this deep has never actually been confirmed safe
    // on-device, so this sidesteps that open question rather than shipping
    // an unverified guess. A smoother Reanimated-driven sway is a
    // reasonable future upgrade once it can be checked on a device.
    const hasSwayableDecoration = useMemo(
        () =>
            state.tiles.some((tile) => {
                if (!tile.item) return false;
                const item = getCatalogItem(tile.item);
                return item?.category === 'trees' || item?.category === 'plants';
            }),
        [state.tiles]
    );
    const [swayTick, setSwayTick] = useState(0);
    useEffect(() => {
        if (!hasSwayableDecoration) return;
        const id = setInterval(() => setSwayTick((t) => t + 1), 900);
        return () => clearInterval(id);
    }, [hasSwayableDecoration]);

    // Catalog items actually selectable right now — has art on this screen
    // AND matches the active category filter ('all' keeps everything, same
    // list as before categories existed). Split out from pickerItems below
    // so the fallback-selection effect can see it without also depending on
    // point-earned-driven lock state.
    const visibleCatalogItems = useMemo(
        () =>
            CATALOG.filter(
                (item) =>
                    getDecorationSprite(item.id, 'isometric') &&
                    (categoryFilter === 'all' || item.category === categoryFilter)
            ),
        [categoryFilter]
    );

    // A category change can hide the currently-selected item entirely — if
    // it does, reassign to something actually visible rather than leaving
    // the picker showing no highlighted item while a tap would still place
    // the now-invisible old selection. Remove is never hidden by a filter,
    // so it never needs reassigning.
    useEffect(() => {
        if (selectedItemId === REMOVE_TOOL_ID) return;
        if (visibleCatalogItems.some((item) => item.id === selectedItemId)) return;
        setSelectedItemId(pickFallbackSelection(state, visibleCatalogItems));
        // Only react to the filtered set changing (i.e. categoryFilter) — not
        // to state/selectedItemId, which would re-fire this on every point earned.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visibleCatalogItems]);

    // Depends on totalPointsEarned (via isItemUnlocked), so this can't be a
    // module-level constant like GROUND_PICKER_ITEMS — recomputed only when
    // lifetime earnings actually change, not on every render.
    const pickerItems: PickerEntry[] = useMemo(
        () => [
            { id: REMOVE_TOOL_ID, label: 'Remove', cost: 0, icon: <Text style={{ fontSize: 22 }}>🗑️</Text> },
            ...visibleCatalogItems.map((item) => {
                const sprite = getDecorationSprite(item.id, 'isometric')!;
                const locked = !isItemUnlocked(state, item);
                return {
                    id: item.id,
                    label: item.label,
                    cost: item.cost,
                    icon: <AtlasSprite atlas={sprite.atlas} sprite={sprite.key} size={PICKER_ICON_SIZE} />,
                    locked,
                    lockedHint: locked ? `Unlocks at ${item.unlockThreshold} pts earned` : undefined,
                };
            }),
        ],
        [visibleCatalogItems, state.totalPointsEarned]
    );

    return (
        <SafeAreaView className={"flex-1 bg-sky"}>
            <View className="p-5">
                <ScreenHeader title="Isometric Garden" />
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8, marginTop: -8 }}>
                    <StatPill label="points" value={state.points} />
                    <StatPill label="earned" value={state.totalPointsEarned} />
                </View>

                <Link href="/quest-page" style={{ color: colors.mutedForeground, textDecorationLine: 'underline' }}>
                    Earn more points from Quests →
                </Link>

                {message && <Text className="text-warning mt-1">{message}</Text>}
            </View>

            <ModeToggle options={MODE_OPTIONS} selected={mode} onSelect={setMode} />

            {mode === 'decorate' ? (
                <>
                    <ModeToggle
                        options={CATEGORY_FILTER_OPTIONS}
                        selected={categoryFilter}
                        onSelect={setCategoryFilter}
                        activeColor={colors.highlight}
                    />
                    <ItemPicker
                        items={pickerItems}
                        selectedId={selectedItemId}
                        onSelect={setSelectedItemId}
                        points={state.points}
                    />
                </>
            ) : mode === 'paint' ? (
                <ItemPicker
                    items={GROUND_PICKER_ITEMS}
                    selectedId={selectedGroundId}
                    onSelect={setSelectedGroundId}
                    points={state.points}
                />
            ) : (
                <View className="px-5 pb-2">
                    <Text className="text-mutedForeground">
                        {moveFromIndex !== null
                            ? 'Tap a tile to move it there'
                            : 'Tap a placed item to inspect or move it'}
                    </Text>
                </View>
            )}

            <View
                style={{
                    flex: 1,
                    paddingBottom: bottomNavSpace,
                }}
            >
                <IsometricGrid
                    gridSize={GRID_SIZE}
                    tileWidth={TILE_WIDTH}
                    tileHeightStep={TILE_HEIGHT_STEP}
                    tileOutlineColor={TILE_OUTLINE_COLOR}
                    tileOutlineOpacity={gridOutlineOpacity[mode]}
                    highlightIndex={previewIndex ?? movePreviewIndex ?? interactSelectedIndex}
                    highlightColor={PREVIEW_HIGHLIGHT_COLOR}
                    flashIndex={invalidFlashIndex}
                    flashColor={colors.flash}
                    flyTo={flyTo}
                    onTilePress={(index) => {
                        if (mode === 'paint') {
                            paintGround(index, selectedGroundId);
                            return;
                        }

                        if (mode === 'interact') {
                            if (moveFromIndex !== null) {
                                if (index === moveFromIndex) {
                                    showMessage('Pick a different tile to move it to');
                                    return;
                                }
                                const block = getMoveBlock(state, moveFromIndex, index);
                                if (block === 'occupied') {
                                    showMessage('Tile already has something');
                                    flashInvalid(index);
                                } else if (block === 'non-placeable-terrain') {
                                    showMessage("Can't move onto water");
                                    flashInvalid(index);
                                } else {
                                    setMovePreviewIndex(index);
                                }
                                return;
                            }

                            if (state.tiles[index].item === null) {
                                showMessage('Nothing to interact with here');
                                setInteractSelectedIndex(null);
                                return;
                            }
                            setInteractSelectedIndex((prev) => (prev === index ? null : index));
                            return;
                        }

                        if (selectedItemId === REMOVE_TOOL_ID) {
                            if (state.tiles[index].item === null) showMessage('Nothing to remove here');
                            else removeItem(index);
                            return;
                        }

                        const item = getCatalogItem(selectedItemId);
                        if (!item) return;

                        const block = getPlacementBlock(state, index, item);
                        if (block === 'occupied') {
                            showMessage('Tile already has something — remove it first');
                            flashInvalid(index);
                        } else if (block === 'non-placeable-terrain') {
                            showMessage("Can't place on water");
                            flashInvalid(index);
                        } else if (block === 'locked') {
                            showMessage('Not unlocked yet');
                            flashInvalid(index);
                        } else if (block === 'insufficient-points') {
                            showMessage('Not enough points');
                            flashInvalid(index);
                        } else {
                            setPreviewIndex(index);
                        }
                    }}
                    renderGround={(index) => (
                        <AtlasSprite
                            atlas={isoBlocksAtlas}
                            sprite={getGroundSpriteKey(state.tiles[index].ground, index, waterTick)}
                            size={TILE_WIDTH}
                        />
                    )}
                    renderDecoration={(index) => {
                        const tile = state.tiles[index];
                        const isDecoratePreview = index === previewIndex;
                        const isMovePreview = index === movePreviewIndex;
                        const isBeingMoved = index === moveFromIndex;
                        // Hide the source tile's real item while a move is pending — it
                        // hasn't actually moved in domain state yet, but showing it
                        // fully there AND a ghost at the candidate destination reads as
                        // "in two places," not "picked up."
                        const itemId = isBeingMoved
                            ? null
                            : isDecoratePreview
                              ? selectedItemId
                              : isMovePreview
                                ? moveItemId
                                : tile.item;
                        if (!itemId) return null;
                        const isGhost = isDecoratePreview || isMovePreview;

                        const sprite = getDecorationSprite(itemId, 'isometric');
                        const catalogItem = getCatalogItem(itemId);
                        const decorationSize = TILE_WIDTH * (catalogItem?.visualScale ?? 1);
                        // Only real, already-settled trees/plants sway — never a ghost
                        // preview (still being positioned, should stay predictable) and
                        // never a rock/log/bench/mushroom (rigid objects don't sway).
                        const swayDeg =
                            !isGhost && (catalogItem?.category === 'trees' || catalogItem?.category === 'plants')
                                ? getSwayDegrees(index, swayTick)
                                : 0;

                        return (
                            <View style={isGhost ? { opacity: 0.55 } : undefined}>
                                {/* Reference box matching the tile's own TOP FACE — this tile
                                 set draws each tile as a pseudo-3D block (flat top + shaded
                                 sides, see the TILE_HEIGHT_STEP comment above), and a
                                 decoration should stand on the flat top, not at the base of
                                 the whole block. Anchoring to the full sprite height here
                                 (as an earlier version of this did, via an invisible copy of
                                 the ground sprite) put a decoration's visual base ~22px below
                                 the tile's own outline — barely noticeable before the outline
                                 existed, obviously wrong once it did (confirmed on-device: a
                                 bush's canopy sat straddling the outline's bottom vertex
                                 instead of standing inside it). */}
                                <View style={{ width: TILE_WIDTH, height: TILE_HEIGHT_STEP }} />

                                <View
                                    style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        alignSelf: 'center',
                                    }}
                                >
                                    <DecorationShadow size={decorationSize} />
                                    {/* Sway rotates only the sprite, pivoted at its own base
                                     (transformOrigin bottom-center) so it reads as bending
                                     from its root rather than tipping over — the shadow stays
                                     put, matching how a real shadow wouldn't rotate with it. */}
                                    <View style={{ transform: [{ rotate: `${swayDeg}deg` }], transformOrigin: '50% 100%' }}>
                                        {sprite ? (
                                            <AtlasSprite
                                                atlas={sprite.atlas}
                                                sprite={sprite.key}
                                                size={decorationSize}
                                            />
                                        ) : (
                                            // Placed via the other screen with no iso art yet
                                            // (e.g. lilyPad, grassTuft) — see UnknownItemMarker.
                                            <UnknownItemMarker size={decorationSize} />
                                        )}
                                    </View>
                                </View>
                            </View>
                        );
                    }}
                />
                <AmbientParticles seed={1} />
                {previewIndex !== null && (
                    <PlacementConfirmBar
                        itemLabel={getCatalogItem(selectedItemId)?.label ?? 'item'}
                        bottom={bottomNavSpace + 12}
                        onConfirm={() => {
                            const item = getCatalogItem(selectedItemId);
                            if (item && previewIndex !== null) {
                                placeItem(previewIndex, item);
                                flyToTile(previewIndex);
                            }
                            setPreviewIndex(null);
                        }}
                        onCancel={() => setPreviewIndex(null)}
                    />
                )}
                {interactSelectedIndex !== null && (
                    <DecorationInfoCard
                        itemLabel={getCatalogItem(state.tiles[interactSelectedIndex].item ?? '')?.label ?? 'Item'}
                        bottom={bottomNavSpace + 12}
                        onMove={() => {
                            const itemId = state.tiles[interactSelectedIndex].item;
                            if (!itemId) return;
                            setMoveItemId(itemId);
                            setMoveFromIndex(interactSelectedIndex);
                            setInteractSelectedIndex(null);
                        }}
                        onClose={() => setInteractSelectedIndex(null)}
                    />
                )}
                {movePreviewIndex !== null && moveItemId && (
                    <PlacementConfirmBar
                        itemLabel={getCatalogItem(moveItemId)?.label ?? 'item'}
                        actionLabel="Move"
                        bottom={bottomNavSpace + 12}
                        onConfirm={() => {
                            if (moveFromIndex !== null) {
                                moveItem(moveFromIndex, movePreviewIndex);
                                flyToTile(movePreviewIndex);
                            }
                            cancelMove();
                        }}
                        onCancel={cancelMove}
                    />
                )}
            </View>
        </SafeAreaView>
    )
}
export default Garden

import { View, Text, TouchableOpacity } from 'react-native'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { styled } from "nativewind";
import {
    SafeAreaView as RNSafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";

import { AmbientParticles } from '@/components/AmbientParticles';
import { AtlasSprite } from '@/components/AtlasSprite';
import { CatalogueSheet } from '@/components/CatalogueSheet';
import { DecorationInfoCard } from '@/components/DecorationInfoCard';
import { DecorationShadow } from '@/components/DecorationShadow';
import { ItemPicker, PickerEntry } from '@/components/ItemPicker';
import { ModeToggle } from '@/components/ModeToggle';
import { PlacementConfirmBar } from '@/components/PlacementConfirmBar';
import { UnknownItemMarker } from '@/components/UnknownItemMarker';
import { PannableGrid } from '@/components/PannableGrid';
import { ScreenHeader, StatPill } from '@/components/ui';
import { topDownGroundAtlas } from '@/lib/atlases/topdown-ground-atlas';
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
import { colors, gridOutlineOpacity, mixColors } from '../../../constants/theme';

const SafeAreaView = styled(RNSafeAreaView);

const TILE_SIZE = 48;
const PICKER_ICON_SIZE = 32;
const HEADER_HEIGHT = 320; // title (ScreenHeader) + points + mode toggle + "see all" link + category filter + picker + safe area

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

// Top-down ground atlas only has grass/dirt/water — no stone-path equivalent,
// so that GROUND_CATALOG entry is filtered out below, same idea as the
// decoration coverage gaps in src/lib/decorations.ts.
const GROUND_SPRITE: Record<string, keyof typeof topDownGroundAtlas.sprites> = {
    grass: 'grass',
    dirt: 'dirt',
    water: 'water',
};

// A few plain grass variants (checked against the actual sprite sheet — see
// topdown-ground-atlas.ts's own comment on which candidates were rejected).
// Repeating 'grass' weights it higher, same convention as the isometric
// screen's GRASS_VARIANTS — the common case stays common.
const GRASS_VARIANTS: readonly (keyof typeof topDownGroundAtlas.sprites)[] = ['grass', 'grass', 'grass2', 'grass3', 'grass4'];

// Deterministic per-tile pick (same tile always renders the same variant, no
// new persisted field needed) — dirt/water have no variant list, so they
// always fall through to their single GROUND_SPRITE entry.
function getGroundSpriteKey(groundId: string, tileIndex: number): keyof typeof topDownGroundAtlas.sprites {
    if (groundId === 'grass') return pickVariant(tileIndex, GRASS_VARIANTS);
    return GROUND_SPRITE[groundId] ?? 'grass';
}

// One full back-and-forth cycle, in degrees — offset per tile index (added
// to the tick before indexing) so a garden full of trees doesn't sway in
// unison like it's one object.
const SWAY_STEPS_DEG = [-2, -1, 0, 1, 2, 1, 0, -1] as const;
function getSwayDegrees(tileIndex: number, tick: number): number {
    return SWAY_STEPS_DEG[(tileIndex + tick) % SWAY_STEPS_DEG.length];
}

const GROUND_PICKER_ITEMS: PickerEntry[] = GROUND_CATALOG.filter((ground) => ground.id in GROUND_SPRITE).map(
    (ground) => ({
        id: ground.id,
        label: ground.label,
        cost: 0,
        icon: (
            <AtlasSprite
                atlas={topDownGroundAtlas}
                sprite={GROUND_SPRITE[ground.id]}
                size={PICKER_ICON_SIZE}
                fit="stretch"
            />
        ),
    })
);

const GardenAlt = () => {
    const { state, placeItem, removeItem, moveItem, paintGround } = useGardenDomain();
    const [mode, setMode] = useState<Mode>('decorate');
    const [selectedItemId, setSelectedItemId] = useState<string>(DEFAULT_CATALOG_ITEM_ID);
    const [selectedGroundId, setSelectedGroundId] = useState<string>(GROUND_PICKER_ITEMS[0].id);
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
    // a row still fires (PannableGrid keys its effect off token, not index).
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

    // Advances the water-shimmer frame on a timer, but only while a water
    // tile actually exists — no point re-rendering the whole 225-tile grid
    // on an interval for a garden with no pond. The top-down ground atlas
    // has only one water sprite (checked — no ripple frame like the iso
    // atlas), so the shimmer is a translucent overlay rather than a
    // sprite-swap; same rotating-subset trick either way.
    const hasWater = useMemo(() => state.tiles.some((tile) => tile.ground === 'water'), [state.tiles]);
    const [waterTick, setWaterTick] = useState(0);
    useEffect(() => {
        if (!hasWater) return;
        const id = setInterval(() => setWaterTick((t) => t + 1), 1200);
        return () => clearInterval(id);
    }, [hasWater]);

    // Gentle idle sway on trees/plants — a discrete step-cycle driven by
    // plain interval state, the same proven-safe mechanism as the water
    // shimmer above, not a continuous Reanimated transform. This screen's
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

    // Proactive "these tiles won't work" preview — every tile that would
    // block the current tool, shown continuously instead of only after a
    // blocked tap. Decorate mode dims occupied/water/etc. tiles for the
    // selected item (or empty tiles for the Remove tool); Interact mode
    // dims invalid destinations once a move is actually in progress. Cheap
    // to recompute — a scan over 225 tiles of already-pure functions, same
    // cost class as other per-render tile computations already happening.
    const dimIndices = useMemo(() => {
        const set = new Set<number>();
        if (mode === 'decorate') {
            if (selectedItemId === REMOVE_TOOL_ID) {
                state.tiles.forEach((tile, i) => {
                    if (tile.item === null) set.add(i);
                });
            } else {
                const item = getCatalogItem(selectedItemId);
                if (item) {
                    state.tiles.forEach((_, i) => {
                        if (getPlacementBlock(state, i, item) !== null) set.add(i);
                    });
                }
            }
        } else if (mode === 'interact' && moveFromIndex !== null) {
            state.tiles.forEach((_, i) => {
                if (getMoveBlock(state, moveFromIndex, i) !== null) set.add(i);
            });
        }
        return set;
    }, [mode, selectedItemId, moveFromIndex, state]);

    // Catalog items actually selectable right now — has art on this screen
    // AND matches the active category filter ('all' keeps everything, same
    // list as before categories existed). Split out from pickerItems below
    // so the fallback-selection effect can see it without also depending on
    // point-earned-driven lock state.
    const visibleCatalogItems = useMemo(
        () =>
            CATALOG.filter(
                (item) =>
                    getDecorationSprite(item.id, 'topDown') &&
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

    // Shared mapping from a catalog item to a picker card — used both for
    // the filtered horizontal row and the catalogue sheet's unfiltered
    // "everything" grid below, so the two never drift apart on how a card
    // is built.
    const toPickerEntry = (item: (typeof CATALOG)[number]): PickerEntry => {
        const deco = getDecorationSprite(item.id, 'topDown')!;
        const locked = !isItemUnlocked(state, item);
        return {
            id: item.id,
            label: item.label,
            cost: item.cost,
            icon: <AtlasSprite atlas={deco.atlas} sprite={deco.key} size={PICKER_ICON_SIZE} />,
            locked,
            lockedHint: locked ? `Unlocks at ${item.unlockThreshold} pts earned` : undefined,
        };
    };

    // Depends on totalPointsEarned (via isItemUnlocked), so this can't be a
    // module-level constant like GROUND_PICKER_ITEMS — recomputed only when
    // lifetime earnings actually change, not on every render.
    const pickerItems: PickerEntry[] = useMemo(
        () => [
            { id: REMOVE_TOOL_ID, label: 'Remove', cost: 0, icon: <Text style={{ fontSize: 22 }}>🗑️</Text> },
            ...visibleCatalogItems.map(toPickerEntry),
        ],
        [visibleCatalogItems, state.totalPointsEarned]
    );

    // Every item this screen has art for, regardless of the category filter
    // — the catalogue sheet's "see everything at once" list.
    const allDecorationItemsForScreen = useMemo(
        () => CATALOG.filter((item) => getDecorationSprite(item.id, 'topDown')),
        []
    );
    const cataloguePickerItems: PickerEntry[] = useMemo(
        () => allDecorationItemsForScreen.map(toPickerEntry),
        [allDecorationItemsForScreen, state.totalPointsEarned]
    );
    const [catalogueOpen, setCatalogueOpen] = useState(false);

    // Selecting from the catalogue can pick an item outside the current
    // category filter — switch the filter to match so the horizontal row
    // (and the fallback-selection effect above) stay consistent with what's
    // actually selected, instead of the row showing nothing highlighted.
    const handleCatalogueSelect = (id: string) => {
        const item = allDecorationItemsForScreen.find((entry) => entry.id === id);
        if (item) setCategoryFilter(item.category);
        setSelectedItemId(id);
    };

    return (
        <SafeAreaView className={"flex-1 bg-sky"}>
            <View className="p-5">
                <ScreenHeader title="Top-Down Garden" />
                <View style={{ flexDirection: 'row', gap: 8, marginTop: -8 }}>
                    <StatPill label="points" value={state.points} />
                    <StatPill label="earned" value={state.totalPointsEarned} />
                </View>
                {message && <Text className="text-warning mt-1">{message}</Text>}
            </View>

            <ModeToggle options={MODE_OPTIONS} selected={mode} onSelect={setMode} />

            {mode === 'decorate' ? (
                <>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 12 }}>
                        <Text
                            onPress={() => setCatalogueOpen(true)}
                            style={{ color: colors.mutedForeground, fontSize: 12, textDecorationLine: 'underline' }}
                        >
                            See all →
                        </Text>
                    </View>
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
                    <CatalogueSheet
                        visible={catalogueOpen}
                        items={cataloguePickerItems}
                        selectedId={selectedItemId}
                        points={state.points}
                        onSelect={handleCatalogueSelect}
                        onClose={() => setCatalogueOpen(false)}
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

            <View style={{ flex: 1 }}>
                <PannableGrid
                    gridSize={GRID_SIZE}
                    tileSize={TILE_SIZE}
                    headerHeight={HEADER_HEIGHT}
                    flyTo={flyTo}
                    edgeFrame={{ width: 20, color: colors.tileOutline }}
                    renderTile={(i) => {
                        const tile = state.tiles[i];
                        const isDecoratePreview = i === previewIndex;
                        const isMovePreview = i === movePreviewIndex;
                        const isBeingMoved = i === moveFromIndex;
                        const isInteractSelected = i === interactSelectedIndex;
                        const isFlash = i === invalidFlashIndex;
                        const isDimmed = !isFlash && dimIndices.has(i);
                        // Hide the source tile's real item while a move is pending — it
                        // hasn't actually moved in domain state yet, but showing it fully
                        // there AND a ghost at the candidate destination reads as "in two
                        // places," not "picked up."
                        const itemId = isBeingMoved
                            ? null
                            : isDecoratePreview
                              ? selectedItemId
                              : isMovePreview
                                ? moveItemId
                                : tile.item;
                        const isGhost = isDecoratePreview || isMovePreview;
                        const isHighlighted = isDecoratePreview || isMovePreview || isInteractSelected;
                        const deco = itemId ? getDecorationSprite(itemId, 'topDown') : undefined;
                        const groundKey = getGroundSpriteKey(tile.ground, i);
                        const itemCatalogEntry = itemId ? getCatalogItem(itemId) : undefined;
                        const decorationSize = TILE_SIZE * (itemCatalogEntry?.visualScale ?? 1);
                        // Only real, already-settled trees/plants sway — never a ghost
                        // preview (still being positioned, should stay predictable) and
                        // never a rock/log/bench/mushroom (rigid objects don't sway).
                        const swayDeg =
                            !isGhost && (itemCatalogEntry?.category === 'trees' || itemCatalogEntry?.category === 'plants')
                                ? getSwayDegrees(i, swayTick)
                                : 0;

                        return (
                            <TouchableOpacity
                                style={{
                                    width: TILE_SIZE,
                                    height: TILE_SIZE,
                                    borderWidth: isHighlighted || isFlash ? 2 : 1,
                                    borderColor: isFlash
                                        ? colors.flash
                                        : isHighlighted
                                          ? colors.highlight
                                          : mixColors(colors.tileOutline, colors.topDownGrassBase, 1 - gridOutlineOpacity[mode]),
                                    // Border eats into the content box (RN sizing is border-box) —
                                    // clip so the fixed-size ground sprite doesn't spill past it.
                                    overflow: 'hidden',
                                }}
                                onPress={() => {
                                    if (mode === 'paint') {
                                        paintGround(i, selectedGroundId);
                                        return;
                                    }

                                    if (mode === 'interact') {
                                        if (moveFromIndex !== null) {
                                            if (i === moveFromIndex) {
                                                showMessage('Pick a different tile to move it to');
                                                return;
                                            }
                                            const block = getMoveBlock(state, moveFromIndex, i);
                                            if (block === 'occupied') {
                                                showMessage('Tile already has something');
                                                flashInvalid(i);
                                            } else if (block === 'non-placeable-terrain') {
                                                showMessage("Can't move onto water");
                                                flashInvalid(i);
                                            } else {
                                                setMovePreviewIndex(i);
                                            }
                                            return;
                                        }

                                        if (tile.item === null) {
                                            showMessage('Nothing to interact with here');
                                            setInteractSelectedIndex(null);
                                            return;
                                        }
                                        setInteractSelectedIndex((prev) => (prev === i ? null : i));
                                        return;
                                    }

                                    if (selectedItemId === REMOVE_TOOL_ID) {
                                        if (tile.item === null) showMessage('Nothing to remove here');
                                        else removeItem(i);
                                        return;
                                    }

                                    const item = getCatalogItem(selectedItemId);
                                    if (!item) return;

                                    const block = getPlacementBlock(state, i, item);
                                    if (block === 'occupied') {
                                        showMessage('Tile already has something — remove it first');
                                        flashInvalid(i);
                                    } else if (block === 'non-placeable-terrain') {
                                        showMessage("Can't place on water");
                                        flashInvalid(i);
                                    } else if (block === 'locked') {
                                        showMessage('Not unlocked yet');
                                        flashInvalid(i);
                                    } else if (block === 'insufficient-points') {
                                        showMessage('Not enough points');
                                        flashInvalid(i);
                                    } else {
                                        setPreviewIndex(i);
                                    }
                                }}
                            >
                                <AtlasSprite atlas={topDownGroundAtlas} sprite={groundKey} size={TILE_SIZE} fit="stretch" />
                                {tile.ground === 'water' && (i + waterTick) % 5 === 0 && (
                                    <View
                                        pointerEvents="none"
                                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.18)' }}
                                    />
                                )}
                                {isDimmed && (
                                    <View
                                        pointerEvents="none"
                                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' }}
                                    />
                                )}
                                {isFlash && (
                                    <View
                                        pointerEvents="none"
                                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(239,68,68,0.35)' }}
                                    />
                                )}
                                {itemId && (
                                    <View
                                        style={{
                                            position: 'absolute',
                                            bottom: 0,
                                            alignSelf: 'center',
                                            opacity: isGhost ? 0.55 : 1,
                                        }}
                                    >
                                        <DecorationShadow size={decorationSize} />
                                        {/* Sway rotates only the sprite, pivoted at its own base
                                         (transformOrigin bottom-center) so it reads as bending
                                         from its root rather than tipping over — the shadow
                                         stays put, matching how a real shadow wouldn't rotate
                                         with it. */}
                                        <View style={{ transform: [{ rotate: `${swayDeg}deg` }], transformOrigin: '50% 100%' }}>
                                            {deco ? (
                                                <AtlasSprite atlas={deco.atlas} sprite={deco.key} size={decorationSize} />
                                            ) : (
                                                // Placed via the other screen with no top-down art yet
                                                // (e.g. bench) — see UnknownItemMarker.
                                                <UnknownItemMarker size={decorationSize} />
                                            )}
                                        </View>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    }}
                />
                <AmbientParticles seed={2} />
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
export default GardenAlt
